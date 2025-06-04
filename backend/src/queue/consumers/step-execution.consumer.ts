// src/queue/consumers/step-execution.consumer.ts (Enhanced with Retry/Failure Handling)
import {Injectable, OnModuleInit} from '@nestjs/common';
import {QueueService} from '../services/queue.service';
import {WorkflowService} from '../../workflow/services/workflow.service';
import {StepExecutionService} from '../../workflow/services/step-execution.service';
import {ActionFactoryService} from '../../actions/services/action-factory.service';
import {ConditionEvaluatorService, WorkflowExecutionContext} from '../../workflow/services/condition-evaluator.service';
import {RetryFailureHandlerService} from '../../workflow/services/retry-failure-handler.service';
import {StepStatus} from '../../common/enums/step-status.enum';
import {WorkflowStatus} from '../../common/enums/workflow-status.enum';

interface WorkflowExecutionContextExtended extends WorkflowExecutionContext {
  workflowId: string;
  workflowExecutionId: string;
  stepData: Map<string, any>;
  globalVariables: Map<string, any>;
}

@Injectable()
export class StepExecutionConsumer implements OnModuleInit {
  private readonly executionLocks = new Map<string, boolean>();
  private readonly workflowContexts = new Map<string, WorkflowExecutionContextExtended>();

  constructor(
    private readonly queueService: QueueService,
    private readonly workflowService: WorkflowService,
    private readonly stepExecutionService: StepExecutionService,
    private readonly actionFactoryService: ActionFactoryService,
    private readonly conditionEvaluatorService: ConditionEvaluatorService,
    private readonly retryFailureHandler: RetryFailureHandlerService,
  ) {
  }

  async onModuleInit() {
    await this.queueService.consumeFromQueue('workflow_execution_queue', async (message) => {
      const {workflowId, workflowExecutionId, previousStepId, stepExecutionId, step, workflow, isRetry = false, attemptNumber = 1} = message;

      const lockKey = `${workflowExecutionId}-${step.id}`;

      // Prevent duplicate execution of the same step (unless it's a retry)
      if (!isRetry && this.executionLocks.get(lockKey)) {
        console.log(`Step ${step.id} already being executed, skipping...`);
        return;
      }

      try {
        this.executionLocks.set(lockKey, true);

        const retryInfo = isRetry ? ` (Retry attempt ${attemptNumber})` : '';
        console.log(`\n=== Processing Step: ${step.name} (${step.id})${retryInfo} ===`);
        console.log(`Step Type: ${step.type}`);
        console.log(`Previous Step: ${previousStepId || 'None'}`);

        // Initialize or get workflow context
        const context = this.getOrCreateWorkflowContext(workflowId, workflowExecutionId);

        // Validate dependencies before execution (skip for retries as dependencies were already validated)
        if (!isRetry) {
          const canExecute = await this.validateDependencies(workflowExecutionId, step, workflow);
          if (!canExecute) {
            console.log(`Dependencies not met for step ${step.id}, requeueing...`);
            // Requeue with delay to check dependencies later
            setTimeout(async () => {
              await this.queueService.sendToQueue('workflow_execution_queue', message);
            }, 1000);
            return;
          }
        }

        // Check if step already exists and is completed/failed (skip for retries)
        if (!isRetry) {
          const allStepExecutions = await this.stepExecutionService.getStepExecutions(workflowExecutionId);
          const existingExecution = allStepExecutions.find(e => e.id === stepExecutionId);

          if (existingExecution && (existingExecution.status === StepStatus.COMPLETED || existingExecution.status === StepStatus.FAILED)) {
            console.log(`Step ${step.id} already processed with status ${existingExecution.status}`);
            return;
          }
        }

        // Update step status to processing
        await this.stepExecutionService.updateStepStatus(stepExecutionId, StepStatus.PROCESSING);

        // Log retry information if applicable
        if (isRetry) {
          const retryStats = this.retryFailureHandler.getRetryStats(stepExecutionId, step.id);
          console.log(`🔄 Retry Stats: Attempt ${attemptNumber}, Total attempts: ${retryStats.totalAttempts}`);
        }

        // Prepare input data for this step
        const stepInputData = this.prepareStepInputData(step, context, previousStepId);

        // Execute actions sequentially with enhanced error handling
        const actionResults = await this.executeActionsWithErrorHandling(
          step,
          stepExecutionId,
          workflowId,
          previousStepId,
          stepInputData,
          attemptNumber
        );

        // Store step output data in context
        const currentStepOutputData = this.storeStepOutputData(step, context, actionResults);

        // Mark step as completed
        await this.stepExecutionService.updateStepStatus(stepExecutionId, StepStatus.COMPLETED);

        console.log(`✅ Step ${step.name} completed successfully${retryInfo}`);

        // Process next steps with enhanced condition evaluation
        await this.processNextStepsWithEnhancedConditions(
          step,
          workflow,
          workflowId,
          workflowExecutionId,
          actionResults,
          context,
          currentStepOutputData
        );

      } catch (error) {
        console.error(`❌ Error executing step ${step.id}:`, error);

        // Use enhanced retry and failure handling
        const failureResult = await this.retryFailureHandler.handleStepFailure(
          step,
          stepExecutionId,
          workflowExecutionId,
          workflowId,
          workflow,
          error,
          this.getOrCreateWorkflowContext(workflowId, workflowExecutionId)
        );

        // Handle the failure result
        if (failureResult.shouldContinue) {
          console.log(`🔄 Continuing workflow despite step failure`);

          if (failureResult.nextSteps && failureResult.nextSteps.length > 0) {
            // Process specific next steps (e.g., skip_to_step scenario)
            await this.processSpecificNextSteps(
              failureResult.nextSteps,
              workflow,
              workflowId,
              workflowExecutionId,
              step.id
            );
          } else {
            // Continue with normal next steps
            const workflowContext = this.getOrCreateWorkflowContext(workflowId, workflowExecutionId);
            await this.processNextStepsWithEnhancedConditions(
              step,
              workflow,
              workflowId,
              workflowExecutionId,
              [],
              workflowContext,
              {}
            );
          }
        }
        // If shouldContinue is false, the workflow has been terminated or retry is scheduled

      } finally {
        this.executionLocks.delete(lockKey);
      }
    });
  }

  private async executeActionsWithErrorHandling(
    step: any,
    stepExecutionId: string,
    workflowId: string,
    previousStepId: string,
    inputData: any,
    attemptNumber: number
  ): Promise<any[]> {
    const actionTypes = Object.keys(step.actions || {});
    const actionResults: any[] = [];

    console.log(`\n--- Executing Actions for Step: ${step.name} (Attempt ${attemptNumber}) ---`);
    console.log(`Actions to execute:`, actionTypes);

    // Execute actions one by one with individual error handling
    for (const actionType of actionTypes) {
      const actionConfig = step.actions[actionType].config;

      console.log(`\n🔄 Executing action: ${actionType}`);
      console.log(`Action config:`, actionConfig);

      // Merge input data with action config
      const enrichedConfig = this.enrichActionConfig(actionConfig, inputData);

      try {
        const actionHandler = this.actionFactoryService.getActionHandler(actionType);
        console.log(`✅ Found handler for action type: ${actionType}`);

        // Execute with timeout to prevent hanging
        const result = await this.executeWithTimeout(
          () => actionHandler.execute(enrichedConfig),
          step.timeout || 30000 // Default 30 second timeout
        );

        console.log(`Action ${actionType} result:`, result.success ? '✅ SUCCESS' : '❌ FAILED');

        const actionResult = await this.stepExecutionService.saveActionResult({
          stepExecutionId,
          workflowId,
          previousStepId,
          stepId: step.id,
          actionType,
          status: result.success ? 'SUCCESS' : 'FAILED',
          result: result.data,
        });

        actionResults.push({
          ...actionResult,
          result: result.data,
          status: result.success ? 'SUCCESS' : 'FAILED',
        });

        // If action failed but step has continue_on_action_failure flag, continue with next action
        if (!result.success && step.continue_on_action_failure) {
          console.log(`⚠️ Action ${actionType} failed but continuing due to continue_on_action_failure flag`);
          continue;
        }

        // If action failed and we don't continue on failure, throw error to trigger step retry/failure handling
        if (!result.success) {
          throw new Error(`Action ${actionType} failed: ${result.error || 'Unknown error'}`);
        }

      } catch (error) {
        console.error(`❌ Action ${actionType} failed:`, error.message);

        // Save failed action result
        await this.stepExecutionService.saveActionResult({
          stepExecutionId,
          workflowId,
          stepId: step.id,
          actionType,
          status: 'FAILED',
          result: {error: error.message},
        });

        // Determine if this is a retryable error
        const isRetryable = this.isRetryableError(error);
        if (isRetryable) {
          console.log(`🔄 Action failure is retryable: ${error.message}`);
        } else {
          console.log(`❌ Action failure is not retryable: ${error.message}`);
        }

        throw error; // Re-throw to trigger step-level retry/failure handling
      }
    }

    return actionResults;
  }

  private async executeWithTimeout<T>(
    asyncFn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Action timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      asyncFn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private isRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';

    // Define retryable error patterns
    const retryablePatterns = [
      'timeout',
      'network',
      'connection reset',
      'rate limit',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout',
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private async processSpecificNextSteps(
    nextSteps: any[],
    workflow: any,
    workflowId: string,
    workflowExecutionId: string,
    previousStepId: string
  ): Promise<void> {
    console.log(`\n--- Processing Specific Next Steps ---`);

    for (const nextStep of nextSteps) {
      console.log(`🎯 Processing skip-to step: ${nextStep.name} (${nextStep.id})`);

      const allStepExecutions = await this.stepExecutionService.getStepExecutions(workflowExecutionId);
      const existingExecution = allStepExecutions.find(e => e.stepId === nextStep.id);

      let nextStepExecution = existingExecution;
      if (!nextStepExecution) {
        nextStepExecution = await this.stepExecutionService.createStepExecution(
          workflowExecutionId,
          workflowId,
          previousStepId,
          nextStep
        );
      }

      // Queue the step
      await this.queueService.sendToQueue('workflow_execution_queue', {
        workflowId,
        workflowExecutionId,
        stepExecutionId: nextStepExecution.id,
        previousStepId,
        step: nextStep,
        workflow,
      });

      console.log(`✅ Queued skip-to step: ${nextStep.name} (${nextStep.id})`);
    }
  }

  private getOrCreateWorkflowContext(workflowId: string, workflowExecutionId: string): WorkflowExecutionContextExtended {
    if (!this.workflowContexts.has(workflowExecutionId)) {
      this.workflowContexts.set(workflowExecutionId, {
        workflowId,
        workflowExecutionId,
        stepData: new Map(),
        globalVariables: new Map()
      });
    }
    return this.workflowContexts.get(workflowExecutionId)!;
  }

  private prepareStepInputData(step: any, context: WorkflowExecutionContextExtended, previousStepId?: string): any {
    const inputData: any = {};


    // Get input data requirements from step definition
    const requiredInputs = step.input_data || [];

    // Add all data from previous steps based on input_data array
    for (const inputKey of requiredInputs) {
      // Check if this is a reference to previous step data
      if (inputKey.startsWith('step.')) {
        // Format: step.stepId.outputKey
        const [, stepId, outputKey] = inputKey.split('.');
        const stepData = context.stepData.get(stepId);
        if (stepData && stepData[outputKey]) {
          inputData[outputKey] = stepData[outputKey];
        }
      } else if (inputKey.startsWith('variables.')) {
        // Format: variables.variableName
        const variableName = inputKey.substring('variables.'.length);
        const variableValue = context.globalVariables.get(variableName);
        if (variableValue !== undefined) {
          inputData[variableName] = variableValue;
        }
      } else {
        // Direct reference - check all previous steps for this key
        for (const [stepId, stepData] of context.stepData.entries()) {
          if (stepData && stepData[inputKey] !== undefined) {
            inputData[inputKey] = stepData[inputKey];
          }
        }

        // Also check global variables
        const globalValue = context.globalVariables.get(inputKey);
        if (globalValue !== undefined) {
          inputData[inputKey] = globalValue;
        }
      }
    }

    // If no specific input_data is defined, add all previous step data
    if (requiredInputs.length === 0 && previousStepId) {
      const previousStepData = context.stepData.get(previousStepId);
      if (previousStepData) {
        Object.assign(inputData, previousStepData);
      }
    }

    return inputData;
  }

  private storeStepOutputData(step: any, context: WorkflowExecutionContextExtended, actionResults: any[]): any {
    const stepOutputData: any = {};

    console.log(`\n--- Storing Output Data for Step: ${step.name} ---`);

    // Process each action's output
    for (const actionResult of actionResults) {
      console.log(`Processing action result for: ${actionResult.actionType}`);
      console.log(`Action status: ${actionResult.status}`);
      console.log(`Action result data:`, actionResult.result);

      if (actionResult.status === 'SUCCESS' && actionResult.result) {
        // Parse the result if it's a string
        let resultData = actionResult.result;
        if (typeof resultData === 'string') {
          try {
            resultData = JSON.parse(resultData);
          } catch (e) {
            // If it's not JSON, use as is
            console.log(`Result data is not JSON, using as string:`, resultData);
          }
        }

        // Merge action results into step output
        if (typeof resultData === 'object' && resultData !== null) {
          // If the result has a 'data' property, extract and flatten it
          if (resultData.data && typeof resultData.data === 'object') {
            Object.assign(stepOutputData, resultData.data);
            console.log(`Extracted and merged data from result.data:`, resultData.data);
          } else {
            Object.assign(stepOutputData, resultData);
            console.log(`Merged entire result object:`, resultData);
          }
        } else {
          stepOutputData[actionResult.actionType] = resultData;
          console.log(`Stored result under action type key:`, {[actionResult.actionType]: resultData});
        }
      }
    }

    // Store step output data
    context.stepData.set(step.id, stepOutputData);
    console.log(`Final step output data stored:`, stepOutputData);

    // Update global variables if step defines variables
    if (step.variables) {
      for (const [key, value] of Object.entries(step.variables)) {
        context.globalVariables.set(key, value);
      }
      console.log(`Updated global variables:`, Object.fromEntries(context.globalVariables));
    }

    console.log(`Stored output data keys:`, Object.keys(stepOutputData));

    // Log all available data for debugging
    console.log(`\n📊 Context Summary for Step ${step.id}:`);
    console.log(`Available step data keys:`, Array.from(context.stepData.keys()));
    console.log(`Available global variables:`, Array.from(context.globalVariables.keys()));
    console.log(`Current step output keys:`, Object.keys(stepOutputData));

    return stepOutputData;
  }

  private async validateDependencies(
    workflowExecutionId: string,
    step: any,
    workflow: any
  ): Promise<boolean> {
    const waitFor = step.wait_for || [];

    if (waitFor.length === 0) {
      return true; // No dependencies
    }

    // Get current status of all step executions
    const allStepExecutions = await this.stepExecutionService.getStepExecutions(workflowExecutionId);
    const statusMap = new Map(allStepExecutions.map(e => [e.stepId, e.status]));

    // Check each dependency
    for (const depStepId of waitFor) {
      const depStatus = statusMap.get(depStepId);

      // Find the dependency step in workflow
      let depStep: any = null;
      if (workflow.nodes && Array.isArray(workflow.nodes)) {
        depStep = workflow.nodes.find((n: any) => n.id === depStepId);
      } else if (workflow.definition && workflow.definition.nodes && Array.isArray(workflow.definition.nodes)) {
        depStep = workflow.definition.nodes.find((n: any) => n.id === depStepId);
      } else if (Array.isArray(workflow)) {
        depStep = workflow.find((n: any) => n.id === depStepId);
      }

      const onFailure = depStep?.error_handling?.on_failure || 'terminate';

      // Dependency must be completed or failed with continue policy
      if (depStatus === StepStatus.COMPLETED) {
        continue; // This dependency is satisfied
      } else if (depStatus === StepStatus.FAILED && onFailure === 'continue') {
        continue; // This dependency failed but we can continue
      } else {
        return false; // Dependency not satisfied
      }
    }

    return true; // All dependencies satisfied
  }

  private enrichActionConfig(actionConfig: any, inputData: any): any {
    // Deep clone the config to avoid modifying the original
    const enrichedConfig = JSON.parse(JSON.stringify(actionConfig));

    console.log(`\n🔧 Enriching action config...`);
    console.log(`Original config:`, actionConfig);
    console.log(`Available input data:`, inputData);

    // Add all input data to the config so handlers can access it
    Object.assign(enrichedConfig, inputData);

    // Replace placeholders in the config with actual input data
    this.replacePlaceholders(enrichedConfig, inputData);

    console.log(`Enriched config after replacement:`, enrichedConfig);

    return enrichedConfig;
  }

  private replacePlaceholders(obj: any, inputData: any): any {
    if (typeof obj === 'string') {
      // Replace template variables like ${variableName} and {variableName}
      let result = obj;

      // Handle ${variableName} format
      result = result.replace(/\$\{([^}]+)\}/g, (match, key) => {
        const replacement = inputData[key] !== undefined ? inputData[key] : match;
        console.log(`  ${match} → ${replacement}`);
        return replacement;
      });

      // Handle {variableName} format
      result = result.replace(/\{([^}]+)\}/g, (match, key) => {
        const replacement = inputData[key] !== undefined ? inputData[key] : match;
        console.log(`  ${match} → ${replacement}`);
        return replacement;
      });



      return result;
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.replacePlaceholders(obj[i], inputData);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = this.replacePlaceholders(obj[key], inputData);
      }
    }
    return obj;
  }

  private async processNextStepsWithEnhancedConditions(
    currentStep: any,
    workflow: any,
    workflowId: string,
    workflowExecutionId: string,
    actionResults: any,
    context: WorkflowExecutionContextExtended,
    currentStepOutputData: any
  ): Promise<void> {
    if (!currentStep.next_steps?.length) {
      console.log(`\n🏁 No next steps for ${currentStep.name}. Checking workflow completion...`);
      // Check if workflow is complete
      await this.checkWorkflowCompletion(workflowExecutionId, workflowId);
      return;
    }

    console.log(`\n--- Processing Next Steps for: ${currentStep.name} ---`);
    console.log(`Next steps:`, currentStep.next_steps.map(s => s.id));

    // Get fresh status of all steps
    const allStepExecutions = await this.stepExecutionService.getStepExecutions(workflowExecutionId);
    const statusMap = new Map(allStepExecutions.map(e => [e.stepId, e.status]));
    const currentStepStatus = statusMap.get(currentStep.id) || 'COMPLETED';

    // Use enhanced condition evaluator to determine which steps should execute
    const validNextSteps = this.conditionEvaluatorService.evaluateNextSteps(
      currentStep.next_steps,
      currentStepStatus,
      context,
      currentStepOutputData
    );

    console.log(`\n🎯 Valid next steps after condition evaluation:`, validNextSteps.map(s => `${s.id} (${s.label || s.conditionType})`));

    for (const nextStepRef of validNextSteps) {
      // Try multiple ways to find the next step in the workflow
      let nextStep: any = null;

      // Method 1: Check workflow.nodes
      if (workflow.nodes && Array.isArray(workflow.nodes)) {
        nextStep = workflow.nodes.find((n: any) => n.id === nextStepRef.id);
      }

      // Method 2: Check workflow.definition.nodes
      if (!nextStep && workflow.definition && workflow.definition.nodes && Array.isArray(workflow.definition.nodes)) {
        nextStep = workflow.definition.nodes.find((n: any) => n.id === nextStepRef.id);
      }

      // Method 3: Check if workflow is directly an array of nodes
      if (!nextStep && Array.isArray(workflow)) {
        nextStep = workflow.find((n: any) => n.id === nextStepRef.id);
      }

      if (!nextStep) {
        console.warn(`⚠️ Next step ${nextStepRef.id} not found in workflow definition`);
        continue;
      }

      console.log(`\n🔄 Processing valid next step: ${nextStep.name} (${nextStep.id})`);

      // Check if this step was already queued/executed
      const existingExecution = allStepExecutions.find(e => e.stepId === nextStep.id);
      if (existingExecution && (existingExecution.status === StepStatus.COMPLETED || existingExecution.status === StepStatus.FAILED)) {
        console.log(`⏭️ Step ${nextStep.id} already processed, skipping`);
        continue;
      }

      // Create step execution if it doesn't exist
      let nextStepExecution = existingExecution;
      if (!nextStepExecution) {
        nextStepExecution = await this.stepExecutionService.createStepExecution(
          workflowExecutionId,
          workflowId,
          currentStep.id,
          nextStep
        );
      }

      // Queue the next step
      await this.queueService.sendToQueue('workflow_execution_queue', {
        workflowId,
        workflowExecutionId: workflowExecutionId,
        stepExecutionId: nextStepExecution.id,
        previousStepId: currentStep.id,
        step: nextStep,
        workflow: workflow,
      });

      console.log(`✅ Queued next step: ${nextStep.name} (${nextStep.id}) - Condition: ${nextStepRef.label || nextStepRef.conditionType}`);
    }

    // Log summary of condition evaluation
    console.log(`\n📋 Condition Evaluation Summary:`);
    console.log(`   Total next steps defined: ${currentStep.next_steps.length}`);
    console.log(`   Valid steps to execute: ${validNextSteps.length}`);
    console.log(`   Skipped steps: ${currentStep.next_steps.length - validNextSteps.length}`);
  }

  private async checkWorkflowCompletion(workflowExecutionId: string, workflowId: string): Promise<void> {
    const stepExecutions = await this.stepExecutionService.getStepExecutions(workflowExecutionId);
    const allCompleted = stepExecutions.every(
      s => s.status === StepStatus.COMPLETED || s.status === StepStatus.FAILED
    );

    if (allCompleted) {
      const hasFailures = stepExecutions.some(s => s.status === StepStatus.FAILED);
      const finalStatus = hasFailures ? WorkflowStatus.COMPLETED_WITH_ERRORS : WorkflowStatus.COMPLETED;

      await this.workflowService.updateWorkflowExecutionStatus(workflowExecutionId, finalStatus);
      await this.workflowService.updateWorkflowStatus(workflowId, finalStatus);

      console.log(`\n🎉 Workflow ${workflowId} completed with status: ${finalStatus}`);

      // Clean up workflow context and retry data
      this.workflowContexts.delete(workflowExecutionId);
      this.retryFailureHandler.clearWorkflowRetryData(workflowExecutionId);
    }
  }
}
