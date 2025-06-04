// src/queue/consumers/workflow.consumer.ts
import {Injectable, OnModuleInit} from '@nestjs/common';
import {QueueService} from '../services/queue.service';
import {WorkflowService} from '../../workflow/services/workflow.service';
import {StepExecutionService} from '../../workflow/services/step-execution.service';
import {WorkflowStatus} from '../../common/enums/workflow-status.enum';

@Injectable()
export class WorkflowConsumer implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly workflowService: WorkflowService,
    private readonly stepExecutionService: StepExecutionService,
  ) {
  }

  async onModuleInit() {
    await this.queueService.consumeFromQueue('workflow_queue', async (message) => {


      const {workflowId, workflow, workflowExecutionId, context} = message;

      try {
        // workflow should be an array of nodes, not an object with nodes property
        let workflowNodes = workflow;

        // Handle different workflow formats
        if (workflow && workflow.nodes && Array.isArray(workflow.nodes)) {
          workflowNodes = workflow.nodes;
        } else if (Array.isArray(workflow)) {
          workflowNodes = workflow;
        } else {
          console.error('Invalid workflow format:', workflow);
          throw new Error('Invalid workflow definition - expected array of nodes');
        }

        const initialNode = workflowNodes[0];
        if (!workflowNodes || !initialNode) {
          throw new Error('Invalid workflow definition [no nodes found]');
        }

        console.log(`📋 Workflow has ${workflowNodes.length} nodes`);
        console.log(`🎯 Initial node: ${initialNode.name} (${initialNode.id})`);

        // Update workflow status
        await this.workflowService.updateWorkflowStatus(workflowId, WorkflowStatus.PROCESSING);

        // Create execution record if not provided
        const execution = workflowExecutionId
          ? {id: workflowExecutionId}
          : await this.workflowService.createExecution(workflowId, context);

        console.log(`📝 Execution ID: ${execution.id}`);

        const stepExecution = await this.stepExecutionService.createStepExecution(
          execution.id,
          workflowId,
          null,
          initialNode
        );

        console.log(`📋 Step execution created: ${stepExecution.id}`);

        // Create workflow object that matches expected format
        const workflowForExecution = {
          nodes: workflowNodes,
          id: workflowId,
          definition: {
            nodes: workflowNodes
          }
        };

        console.log(`📋 Workflow nodes for execution:`, workflowNodes.map(n => ({id: n.id, name: n.name})));

        // Push to execution queue
        await this.queueService.sendToQueue('workflow_execution_queue', {
          workflowId,
          workflowExecutionId: execution.id,
          previousStepId: null, // First step has no previous step
          stepExecutionId: stepExecution.id,
          step: initialNode,
          workflow: workflowForExecution,
        });

        console.log(`✅ Queued initial step: ${initialNode.name} for execution`);

      } catch (error) {
        console.error('❌ Error processing workflow:', error);
        await this.workflowService.updateWorkflowStatus(workflowId, WorkflowStatus.FAILED);
        if (message.workflowExecutionId) {
          await this.workflowService.updateWorkflowExecutionStatus(
            message.workflowExecutionId,
            WorkflowStatus.FAILED
          );
        }
      }
    });
  }
}
