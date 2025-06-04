import {Injectable, Logger} from '@nestjs/common';
import {StepExecutionService} from './step-execution.service';
import {WorkflowService} from './workflow.service';
import {QueueService} from '../../queue/services/queue.service';
import {StepStatus} from '../../common/enums/step-status.enum';
import {WorkflowStatus} from '../../common/enums/workflow-status.enum';

export interface RetryConfig {
    max_retries?: number;
    backoff_strategy?: 'linear' | 'exponential' | 'fixed';
    initial_delay_ms?: number;
    max_delay_ms?: number;
    retry_on_status?: string[]; // Which statuses should trigger retry
    jitter?: boolean; // Add randomization to prevent thundering herd
}

export interface ErrorHandlingConfig {
    on_failure?: 'terminate' | 'continue' | 'retry' | 'skip_to_step';
    skip_to_step_id?: string;
    retry_count?: number;
    backoff_strategy?: 'linear' | 'exponential' | 'fixed';
    initial_delay_ms?: number;
    max_delay_ms?: number;
    retry_on_status?: string[];
    notify_on_failure?: boolean;
    failure_notification_config?: {
        channel?: string;
        webhook_url?: string;
        message_template?: string;
    };
}

export interface RetryAttempt {
    stepExecutionId: string;
    attemptNumber: number;
    timestamp: Date;
    error: string;
    nextRetryAt?: Date;
}

@Injectable()
export class RetryFailureHandlerService {
    private readonly logger = new Logger(RetryFailureHandlerService.name);
    private readonly retryAttempts = new Map<string, RetryAttempt[]>();
    private readonly activeRetries = new Set<string>();

    constructor(
        private readonly stepExecutionService: StepExecutionService,
        private readonly workflowService: WorkflowService,
        private readonly queueService: QueueService,
    ) {
    }

    /**
     * Handles step failure with retry logic and error handling
     */
    async handleStepFailure(
        step: any,
        stepExecutionId: string,
        workflowExecutionId: string,
        workflowId: string,
        workflow: any,
        error: any,
        context: any
    ): Promise<{ shouldContinue: boolean; nextSteps?: any[] }> {
        this.logger.error(`🚨 Step ${step.name} (${step.id}) failed:`, error.message);

        const errorConfig: ErrorHandlingConfig = step.error_handling || {};
        const retryKey = `${stepExecutionId}-${step.id}`;

        // Check if we should retry
        const shouldRetry = await this.shouldRetryStep(step, stepExecutionId, error, errorConfig);

        if (shouldRetry) {
            this.logger.log(`🔄 Attempting retry for step ${step.name}`);
            await this.scheduleRetry(step, stepExecutionId, workflowExecutionId, workflowId, workflow, error, context);
            return {shouldContinue: false}; // Don't continue, waiting for retry
        }

        // Mark step as permanently failed
        await this.stepExecutionService.updateStepStatus(stepExecutionId, StepStatus.FAILED);

        // Record final failure
        await this.recordFailure(stepExecutionId, step, error, errorConfig);

        // Handle failure based on configuration
        return await this.handleFailureAction(
            step,
            stepExecutionId,
            workflowExecutionId,
            workflowId,
            workflow,
            error,
            errorConfig,
            context
        );
    }

    /**
     * Determines if a step should be retried
     */
    private async shouldRetryStep(
        step: any,
        stepExecutionId: string,
        error: any,
        errorConfig: ErrorHandlingConfig
    ): Promise<boolean> {
        const retryKey = `${stepExecutionId}-${step.id}`;

        // If on_failure is explicitly set to terminate, don't retry
        if (errorConfig.on_failure === 'terminate') {
            this.logger.log(`❌ on_failure is set to 'terminate' for step ${step.id} - no retries`);
            return false;
        }

        // If on_failure is continue or skip_to_step, don't retry (handle failure directly)
        if (errorConfig.on_failure === 'continue' || errorConfig.on_failure === 'skip_to_step') {
            this.logger.log(`❌ on_failure is set to '${errorConfig.on_failure}' for step ${step.id} - no retries`);
            return false;
        }

        const maxRetries = errorConfig.retry_count || 0;

        // Check if retries are disabled
        if (maxRetries === 0) {
            this.logger.log(`❌ No retries configured for step ${step.id} (retry_count: ${maxRetries})`);
            return false;
        }

        // Check current attempt count
        const attempts = this.retryAttempts.get(retryKey) || [];
        if (attempts.length >= maxRetries) {
            this.logger.log(`❌ Max retries (${maxRetries}) exceeded for step ${step.id}`);
            return false;
        }

        // Check if this error type should trigger retry (with defaults)
        const retryOnStatus = errorConfig.retry_on_status || ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT'];
        const errorType = this.categorizeError(error);

        if (!retryOnStatus.includes(errorType)) {
            this.logger.log(`❌ Error type ${errorType} not configured for retry. Retryable types: ${retryOnStatus.join(', ')}`);
            return false;
        }

        // Check if already actively retrying (prevent duplicate retries)
        if (this.activeRetries.has(retryKey)) {
            this.logger.log(`⏳ Step ${step.id} already has active retry scheduled`);
            return false;
        }

        this.logger.log(`✅ Step ${step.id} qualifies for retry (attempt ${attempts.length + 1}/${maxRetries})`);
        return true;
    }

    /**
     * Schedules a retry for the failed step
     */
    private async scheduleRetry(
        step: any,
        stepExecutionId: string,
        workflowExecutionId: string,
        workflowId: string,
        workflow: any,
        error: any,
        context: any
    ): Promise<void> {
        const retryKey = `${stepExecutionId}-${step.id}`;
        const errorConfig: ErrorHandlingConfig = step.error_handling || {};

        // Record this retry attempt
        const attempts = this.retryAttempts.get(retryKey) || [];
        const attemptNumber = attempts.length + 1;

        const retryAttempt: RetryAttempt = {
            stepExecutionId,
            attemptNumber,
            timestamp: new Date(),
            error: error.message || error.toString(),
        };

        // Calculate delay based on backoff strategy
        const delay = this.calculateRetryDelay(attemptNumber, errorConfig);
        retryAttempt.nextRetryAt = new Date(Date.now() + delay);

        attempts.push(retryAttempt);
        this.retryAttempts.set(retryKey, attempts);
        this.activeRetries.add(retryKey);

        this.logger.log(`⏰ Scheduling retry for step ${step.name} in ${delay}ms (attempt ${attemptNumber})`);

        // Update step status to show it's being retried
        await this.stepExecutionService.updateStepStatus(stepExecutionId, StepStatus.QUEUED);

        // Schedule the retry
        setTimeout(async () => {
            try {
                this.logger.log(`🔄 Executing retry attempt ${attemptNumber} for step ${step.name}`);

                // Remove from active retries
                this.activeRetries.delete(retryKey);

                // Re-queue the step for execution
                await this.queueService.sendToQueue('workflow_execution_queue', {
                    workflowId,
                    workflowExecutionId,
                    stepExecutionId,
                    previousStepId: step.previousStepId,
                    step,
                    workflow,
                    isRetry: true,
                    attemptNumber,
                });

            } catch (retryError) {
                this.logger.error(`❌ Failed to schedule retry for step ${step.id}:`, retryError);
                this.activeRetries.delete(retryKey);
                // Mark as failed if we can't even schedule the retry
                await this.stepExecutionService.updateStepStatus(stepExecutionId, StepStatus.FAILED);
            }
        }, delay);
    }

    /**
     * Calculates retry delay based on backoff strategy
     */
    private calculateRetryDelay(attemptNumber: number, errorConfig: ErrorHandlingConfig): number {
        // Set defaults with fallbacks
        const strategy = errorConfig.backoff_strategy || 'exponential';
        const initialDelay = errorConfig.initial_delay_ms || 1000;
        const maxDelay = errorConfig.max_delay_ms || 30000; // 30 seconds max

        let delay: number;

        switch (strategy) {
            case 'linear':
                delay = initialDelay * attemptNumber;
                break;
            case 'exponential':
                delay = initialDelay * Math.pow(2, attemptNumber - 1);
                break;
            case 'fixed':
            default:
                delay = initialDelay;
                break;
        }

        // Add jitter to prevent thundering herd (±25% randomization)
        const jitter = delay * 0.25 * (Math.random() - 0.5);
        delay += jitter;

        // Ensure delay doesn't exceed maximum
        delay = Math.min(delay, maxDelay);

        return Math.round(delay);
    }

    /**
     * Handles the failure action based on configuration
     */
    private async handleFailureAction(
        step: any,
        stepExecutionId: string,
        workflowExecutionId: string,
        workflowId: string,
        workflow: any,
        error: any,
        errorConfig: ErrorHandlingConfig,
        context: any
    ): Promise<{ shouldContinue: boolean; nextSteps?: any[] }> {
        // Use default value if on_failure is not specified
        const onFailure = errorConfig.on_failure || 'terminate';

        this.logger.log(`🎯 Executing failure action: ${onFailure} for step ${step.name}`);
        this.logger.log(`📋 Error config: ${JSON.stringify(errorConfig)}`);

        switch (onFailure) {
            case 'terminate':
                this.logger.error(`🛑 Terminating workflow due to step failure: ${step.name}`);
                await this.terminateWorkflow(workflowExecutionId, workflowId, error);
                return {shouldContinue: false};

            case 'continue':
                this.logger.log(`➡️ Continuing workflow despite step failure: ${step.name}`);
                return {shouldContinue: true};

            case 'skip_to_step':
                if (errorConfig.skip_to_step_id) {
                    const skipToStep = this.findStepInWorkflow(workflow, errorConfig.skip_to_step_id);
                    if (skipToStep) {
                        this.logger.log(`⏭️ Skipping to step: ${skipToStep.name} (${skipToStep.id})`);
                        return {shouldContinue: true, nextSteps: [skipToStep]};
                    } else {
                        this.logger.error(`❌ Skip-to step ${errorConfig.skip_to_step_id} not found, terminating workflow`);
                        await this.terminateWorkflow(workflowExecutionId, workflowId, error);
                        return {shouldContinue: false};
                    }
                } else {
                    this.logger.error(`❌ skip_to_step_id not specified for on_failure: skip_to_step, terminating workflow`);
                    await this.terminateWorkflow(workflowExecutionId, workflowId, error);
                    return {shouldContinue: false};
                }

            case 'retry':
                // This should not happen here since retry is handled earlier
                this.logger.warn(`⚠️ Retry failure action reached - this shouldn't happen. Terminating workflow.`);
                await this.terminateWorkflow(workflowExecutionId, workflowId, error);
                return {shouldContinue: false};

            default:
                this.logger.warn(`⚠️ Unknown failure action: ${onFailure}, terminating workflow`);
                await this.terminateWorkflow(workflowExecutionId, workflowId, error);
                return {shouldContinue: false};
        }
    }

    /**
     * Terminates the workflow due to failure
     */
    private async terminateWorkflow(workflowExecutionId: string, workflowId: string, error: any): Promise<void> {
        this.logger.error(`🛑 Terminating workflow ${workflowId} due to step failure`);

        await this.workflowService.updateWorkflowExecutionStatus(workflowExecutionId, WorkflowStatus.FAILED);
        await this.workflowService.updateWorkflowStatus(workflowId, WorkflowStatus.FAILED);

        // Send failure notification if configured
        await this.sendFailureNotification(workflowId, workflowExecutionId, error);
    }

    /**
     * Sends failure notification
     */
    private async sendFailureNotification(workflowId: string, workflowExecutionId: string, error: any): Promise<void> {
        try {
            // This could be enhanced to use your Slack handler or other notification services
            this.logger.error(`📧 Workflow ${workflowId} failed - Execution: ${workflowExecutionId}`, error.message);

            // You can integrate with your existing Slack handler here
            // await this.slackHandler.execute({
            //   channel: '#workflow-alerts',
            //   message: `🚨 Workflow ${workflowId} failed: ${error.message}`
            // });
        } catch (notificationError) {
            this.logger.error(`❌ Failed to send failure notification:`, notificationError);
        }
    }

    /**
     * Records failure details for audit and debugging
     */
    private async recordFailure(
        stepExecutionId: string,
        step: any,
        error: any,
        errorConfig: ErrorHandlingConfig
    ): Promise<void> {
        const retryKey = `${stepExecutionId}-${step.id}`;
        const attempts = this.retryAttempts.get(retryKey) || [];

        const failureRecord = {
            stepId: step.id,
            stepName: step.name,
            stepExecutionId,
            finalError: error.message || error.toString(),
            totalAttempts: attempts.length + 1, // +1 for the original attempt
            retryHistory: attempts,
            errorHandlingConfig: errorConfig,
            timestamp: new Date(),
        };

        // You could save this to database or logging system
        this.logger.error(`📝 Failure recorded for step ${step.name}:`, JSON.stringify(failureRecord, null, 2));

        // Clean up retry tracking for this step
        this.retryAttempts.delete(retryKey);
        this.activeRetries.delete(retryKey);
    }

    /**
     * Categorizes error for retry decisions
     */
    private categorizeError(error: any): string {
        const errorMessage = error.message?.toLowerCase() || error.toString().toLowerCase();

        if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
            return 'TIMEOUT';
        }
        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            return 'NETWORK_ERROR';
        }
        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
            return 'RATE_LIMIT';
        }
        if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            return 'PERMISSION_ERROR';
        }
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            return 'NOT_FOUND';
        }
        if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return 'VALIDATION_ERROR';
        }

        return 'UNKNOWN_ERROR';
    }

    /**
     * Finds a step in the workflow by ID
     */
    private findStepInWorkflow(workflow: any, stepId: string): any {
        // Try multiple ways to find the step
        if (workflow.nodes && Array.isArray(workflow.nodes)) {
            return workflow.nodes.find((n: any) => n.id === stepId);
        }
        if (workflow.definition && workflow.definition.nodes && Array.isArray(workflow.definition.nodes)) {
            return workflow.definition.nodes.find((n: any) => n.id === stepId);
        }
        if (Array.isArray(workflow)) {
            return workflow.find((n: any) => n.id === stepId);
        }
        return null;
    }

    /**
     * Gets retry statistics for a step
     */
    getRetryStats(stepExecutionId: string, stepId: string): {
        totalAttempts: number;
        isRetrying: boolean;
        nextRetryAt?: Date
    } {
        const retryKey = `${stepExecutionId}-${stepId}`;
        const attempts = this.retryAttempts.get(retryKey) || [];
        const isRetrying = this.activeRetries.has(retryKey);
        const lastAttempt = attempts[attempts.length - 1];

        return {
            totalAttempts: attempts.length,
            isRetrying,
            nextRetryAt: lastAttempt?.nextRetryAt,
        };
    }

    /**
     * Clears retry data for a workflow (cleanup after completion)
     */
    clearWorkflowRetryData(workflowExecutionId: string): void {
        const keysToDelete: string[] = [];

        for (const [key, attempts] of this.retryAttempts.entries()) {
            if (attempts.some(attempt => attempt.stepExecutionId.includes(workflowExecutionId))) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            this.retryAttempts.delete(key);
            this.activeRetries.delete(key);
        });

        this.logger.log(`🧹 Cleared retry data for workflow execution: ${workflowExecutionId}`);
    }
}
