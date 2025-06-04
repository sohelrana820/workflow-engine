import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';

export interface WorkflowMetrics {
    workflowId: string;
    executionId: string;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    retriedSteps: number;
    averageStepDuration: number;
    totalDuration: number;
    errorRate: number;
    retryRate: number;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed' | 'timeout';
}

export interface StepMetrics {
    stepId: string;
    stepName: string;
    stepType: string;
    workflowExecutionId: string;
    attempts: number;
    totalDuration: number;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
    errors: ErrorMetric[];
    startTime: Date;
    endTime?: Date;
}

export interface ErrorMetric {
    errorType: string;
    errorMessage: string;
    isRetryable: boolean;
    occurredAt: Date;
    attemptNumber: number;
    stackTrace?: string;
    context?: any;
}

export interface AlertThreshold {
    metric: 'error_rate' | 'retry_rate' | 'duration' | 'failure_count';
    threshold: number;
    timeWindow: number;
    alertChannel: string;
    enabled: boolean;
}

@Injectable()
export class WorkflowMonitoringService {
    private readonly logger = new Logger(WorkflowMonitoringService.name);
    private readonly workflowMetrics = new Map<string, WorkflowMetrics>();
    private readonly stepMetrics = new Map<string, StepMetrics>();
    private readonly errorHistory: ErrorMetric[] = [];
    private readonly alertThresholds: AlertThreshold[] = [];

    constructor() {
        // Initialize default alert thresholds
        this.initializeDefaultThresholds();

        // Start periodic monitoring
        this.startPeriodicMonitoring();
    }

    /**
     * Records workflow start
     */
    recordWorkflowStart(workflowId: string, executionId: string, totalSteps: number): void {
        const metrics: WorkflowMetrics = {
            workflowId,
            executionId,
            totalSteps,
            completedSteps: 0,
            failedSteps: 0,
            retriedSteps: 0,
            averageStepDuration: 0,
            totalDuration: 0,
            errorRate: 0,
            retryRate: 0,
            startTime: new Date(),
            status: 'running',
        };

        this.workflowMetrics.set(executionId, metrics);
        this.logger.log(`📊 Started tracking workflow: ${workflowId} (${executionId})`);
    }

    /**
     * Records step start
     */
    recordStepStart(
        stepId: string,
        stepName: string,
        stepType: string,
        workflowExecutionId: string
    ): void {
        const metrics: StepMetrics = {
            stepId,
            stepName,
            stepType,
            workflowExecutionId,
            attempts: 1,
            totalDuration: 0,
            status: 'processing',
            errors: [],
            startTime: new Date(),
        };

        this.stepMetrics.set(`${workflowExecutionId}-${stepId}`, metrics);
        this.logger.debug(`🔍 Started tracking step: ${stepName} (${stepId})`);
    }

    /**
     * Records step completion
     */
    recordStepCompletion(
        stepId: string,
        workflowExecutionId: string,
        success: boolean,
        duration: number
    ): void {
        const stepKey = `${workflowExecutionId}-${stepId}`;
        const stepMetrics = this.stepMetrics.get(stepKey);
        const workflowMetrics = this.workflowMetrics.get(workflowExecutionId);

        if (stepMetrics) {
            stepMetrics.endTime = new Date();
            stepMetrics.totalDuration = duration;
            stepMetrics.status = success ? 'completed' : 'failed';
        }

        if (workflowMetrics) {
            if (success) {
                workflowMetrics.completedSteps++;
            } else {
                workflowMetrics.failedSteps++;
            }
            this.updateWorkflowMetrics(workflowMetrics);
        }

        this.logger.debug(`📈 Step ${stepId} completed: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
    }

    /**
     * Records step retry
     */
    recordStepRetry(
        stepId: string,
        workflowExecutionId: string,
        attemptNumber: number,
        error: any
    ): void {
        const stepKey = `${workflowExecutionId}-${stepId}`;
        const stepMetrics = this.stepMetrics.get(stepKey);
        const workflowMetrics = this.workflowMetrics.get(workflowExecutionId);

        if (stepMetrics) {
            stepMetrics.attempts = attemptNumber;
            stepMetrics.status = 'retrying';

            // Record error
            const errorMetric: ErrorMetric = {
                errorType: this.categorizeError(error),
                errorMessage: error.message || error.toString(),
                isRetryable: true,
                occurredAt: new Date(),
                attemptNumber,
                context: {stepId, workflowExecutionId},
            };

            stepMetrics.errors.push(errorMetric);
            this.errorHistory.push(errorMetric);
        }

        if (workflowMetrics) {
            workflowMetrics.retriedSteps++;
            this.updateWorkflowMetrics(workflowMetrics);
        }

        this.logger.warn(`🔄 Step ${stepId} retry attempt ${attemptNumber}: ${error.message}`);
    }

    /**
     * Records step failure
     */
    recordStepFailure(
        stepId: string,
        workflowExecutionId: string,
        error: any,
        finalAttempt: boolean = false
    ): void {
        const stepKey = `${workflowExecutionId}-${stepId}`;
        const stepMetrics = this.stepMetrics.get(stepKey);

        if (stepMetrics) {
            const errorMetric: ErrorMetric = {
                errorType: this.categorizeError(error),
                errorMessage: error.message || error.toString(),
                isRetryable: false,
                occurredAt: new Date(),
                attemptNumber: stepMetrics.attempts,
                stackTrace: error.stack,
                context: {stepId, workflowExecutionId, finalAttempt},
            };

            stepMetrics.errors.push(errorMetric);
            this.errorHistory.push(errorMetric);

            if (finalAttempt) {
                stepMetrics.status = 'failed';
            }
        }

        this.logger.error(`❌ Step ${stepId} failed (final: ${finalAttempt}): ${error.message}`);
    }

    /**
     * Records workflow completion
     */
    recordWorkflowCompletion(
        workflowExecutionId: string,
        success: boolean,
        duration: number
    ): void {
        const workflowMetrics = this.workflowMetrics.get(workflowExecutionId);

        if (workflowMetrics) {
            workflowMetrics.endTime = new Date();
            workflowMetrics.totalDuration = duration;
            workflowMetrics.status = success ? 'completed' : 'failed';
            this.updateWorkflowMetrics(workflowMetrics);

            this.logger.log(`🏁 Workflow ${workflowMetrics.workflowId} completed: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);

            // Check for alerts
            this.checkAlertThresholds(workflowMetrics);

            // Archive metrics after completion
            setTimeout(() => this.archiveWorkflowMetrics(workflowExecutionId), 300000); // 5 minutes
        }
    }

    /**
     * Gets current workflow metrics
     */
    getWorkflowMetrics(workflowExecutionId: string): WorkflowMetrics | undefined {
        return this.workflowMetrics.get(workflowExecutionId);
    }

    /**
     * Gets step metrics
     */
    getStepMetrics(stepId: string, workflowExecutionId: string): StepMetrics | undefined {
        return this.stepMetrics.get(`${workflowExecutionId}-${stepId}`);
    }

    /**
     * Gets error statistics for a time period
     */
    getErrorStatistics(timeWindowMinutes: number = 60): {
        totalErrors: number;
        errorsByType: Record<string, number>;
        retryableErrors: number;
        nonRetryableErrors: number;
        errorRate: number;
    } {
        const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
        const recentErrors = this.errorHistory.filter(error => error.occurredAt >= cutoffTime);

        const errorsByType: Record<string, number> = {};
        let retryableErrors = 0;
        let nonRetryableErrors = 0;

        recentErrors.forEach(error => {
            errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
            if (error.isRetryable) {
                retryableErrors++;
            } else {
                nonRetryableErrors++;
            }
        });

        // Calculate error rate (errors per minute)
        const errorRate = recentErrors.length / timeWindowMinutes;

        return {
            totalErrors: recentErrors.length,
            errorsByType,
            retryableErrors,
            nonRetryableErrors,
            errorRate,
        };
    }

    /**
     * Gets system health status
     */
    getSystemHealth(): {
        status: 'healthy' | 'degraded' | 'critical';
        activeWorkflows: number;
        errorRate: number;
        retryRate: number;
        averageStepDuration: number;
        alerts: string[];
    } {
        const activeWorkflows = Array.from(this.workflowMetrics.values())
            .filter(metrics => metrics.status === 'running').length;

        const errorStats = this.getErrorStatistics(15); // Last 15 minutes
        const recentMetrics = Array.from(this.workflowMetrics.values())
            .filter(metrics => metrics.endTime && metrics.endTime >= new Date(Date.now() - 15 * 60 * 1000));

        const averageStepDuration = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.averageStepDuration, 0) / recentMetrics.length
            : 0;

        const retryRate = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.retryRate, 0) / recentMetrics.length
            : 0;

        const alerts: string[] = [];
        let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

        // Determine system status based on thresholds
        if (errorStats.errorRate > 5) {
            status = 'critical';
            alerts.push(`High error rate: ${errorStats.errorRate.toFixed(2)} errors/minute`);
        } else if (errorStats.errorRate > 2) {
            status = 'degraded';
            alerts.push(`Elevated error rate: ${errorStats.errorRate.toFixed(2)} errors/minute`);
        }

        if (retryRate > 30) {
            status = status === 'critical' ? 'critical' : 'degraded';
            alerts.push(`High retry rate: ${retryRate.toFixed(1)}%`);
        }

        if (averageStepDuration > 30000) {
            status = status === 'critical' ? 'critical' : 'degraded';
            alerts.push(`Slow step execution: ${(averageStepDuration / 1000).toFixed(1)}s average`);
        }

        return {
            status,
            activeWorkflows,
            errorRate: errorStats.errorRate,
            retryRate,
            averageStepDuration,
            alerts,
        };
    }

    private updateWorkflowMetrics(metrics: WorkflowMetrics): void {
        // Calculate error rate
        const totalProcessedSteps = metrics.completedSteps + metrics.failedSteps;
        metrics.errorRate = totalProcessedSteps > 0 ? (metrics.failedSteps / totalProcessedSteps) * 100 : 0;

        // Calculate retry rate
        metrics.retryRate = totalProcessedSteps > 0 ? (metrics.retriedSteps / totalProcessedSteps) * 100 : 0;

        // Calculate average step duration
        const stepMetricsForWorkflow = Array.from(this.stepMetrics.values())
            .filter(step => step.workflowExecutionId === metrics.executionId && step.endTime);

        if (stepMetricsForWorkflow.length > 0) {
            metrics.averageStepDuration = stepMetricsForWorkflow
                .reduce((sum, step) => sum + step.totalDuration, 0) / stepMetricsForWorkflow.length;
        }

        // Update total duration if workflow is complete
        if (metrics.endTime) {
            metrics.totalDuration = metrics.endTime.getTime() - metrics.startTime.getTime();
        }
    }

    private categorizeError(error: any): string {
        const errorMessage = error.message?.toLowerCase() || error.toString().toLowerCase();

        if (errorMessage.includes('timeout')) return 'TIMEOUT';
        if (errorMessage.includes('network') || errorMessage.includes('connection')) return 'NETWORK_ERROR';
        if (errorMessage.includes('rate limit')) return 'RATE_LIMIT';
        if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) return 'PERMISSION_ERROR';
        if (errorMessage.includes('not found')) return 'NOT_FOUND';
        if (errorMessage.includes('validation')) return 'VALIDATION_ERROR';
        if (errorMessage.includes('quota') || errorMessage.includes('limit exceeded')) return 'QUOTA_EXCEEDED';

        return 'UNKNOWN_ERROR';
    }

    private initializeDefaultThresholds(): void {
        this.alertThresholds.push(
            {
                metric: 'error_rate',
                threshold: 10, // 10% error rate
                timeWindow: 15,
                alertChannel: '#workflow-alerts',
                enabled: true,
            },
            {
                metric: 'retry_rate',
                threshold: 25, // 25% retry rate
                timeWindow: 10,
                alertChannel: '#workflow-alerts',
                enabled: true,
            },
            {
                metric: 'duration',
                threshold: 300000, // 5 minutes
                timeWindow: 5,
                alertChannel: '#performance-alerts',
                enabled: true,
            }
        );
    }

    private checkAlertThresholds(metrics: WorkflowMetrics): void {
        this.alertThresholds.forEach(threshold => {
            if (!threshold.enabled) return;

            let shouldAlert = false;
            let alertMessage = '';

            switch (threshold.metric) {
                case 'error_rate':
                    if (metrics.errorRate > threshold.threshold) {
                        shouldAlert = true;
                        alertMessage = `High error rate: ${metrics.errorRate.toFixed(1)}% (threshold: ${threshold.threshold}%)`;
                    }
                    break;
                case 'retry_rate':
                    if (metrics.retryRate > threshold.threshold) {
                        shouldAlert = true;
                        alertMessage = `High retry rate: ${metrics.retryRate.toFixed(1)}% (threshold: ${threshold.threshold}%)`;
                    }
                    break;
                case 'duration':
                    if (metrics.totalDuration > threshold.threshold) {
                        shouldAlert = true;
                        alertMessage = `Long execution time: ${(metrics.totalDuration / 1000).toFixed(1)}s (threshold: ${(threshold.threshold / 1000).toFixed(1)}s)`;
                    }
                    break;
            }

            if (shouldAlert) {
                this.sendAlert(threshold.alertChannel, alertMessage, metrics);
            }
        });
    }

    private sendAlert(channel: string, message: string, metrics: WorkflowMetrics): void {
        // This would integrate with your notification system (Slack, email, etc.)
        this.logger.warn(`🚨 ALERT [${channel}]: ${message} - Workflow: ${metrics.workflowId} (${metrics.executionId})`);

        // You could integrate with your Slack handler here
        // await this.slackHandler.execute({
        //   channel,
        //   message: `🚨 ${message}\n\nWorkflow: ${metrics.workflowId}\nExecution: ${metrics.executionId}\nSteps: ${metrics.completedSteps}/${metrics.totalSteps}`
        // });
    }

    private startPeriodicMonitoring(): void {
        // Clean up old error history every hour
        setInterval(() => {
            const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
            const originalLength = this.errorHistory.length;
            this.errorHistory.splice(0, this.errorHistory.length,
                ...this.errorHistory.filter(error => error.occurredAt >= cutoffTime)
            );

            if (originalLength !== this.errorHistory.length) {
                this.logger.debug(`🧹 Cleaned up ${originalLength - this.errorHistory.length} old error records`);
            }
        }, 60 * 60 * 1000); // Every hour

        // Log system health every 5 minutes
        setInterval(() => {
            const health = this.getSystemHealth();
            this.logger.log(`💓 System Health: ${health.status.toUpperCase()} - Active: ${health.activeWorkflows}, Errors: ${health.errorRate.toFixed(2)}/min, Retries: ${health.retryRate.toFixed(1)}%`);

            if (health.alerts.length > 0) {
                this.logger.warn(`⚠️ Active alerts: ${health.alerts.join(', ')}`);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    private archiveWorkflowMetrics(workflowExecutionId: string): void {
        this.workflowMetrics.delete(workflowExecutionId);

        // Clean up associated step metrics
        Array.from(this.stepMetrics.keys())
            .filter(key => key.startsWith(workflowExecutionId))
            .forEach(key => this.stepMetrics.delete(key));

        this.logger.debug(`🗄️ Archived metrics for workflow execution: ${workflowExecutionId}`);
    }
}
