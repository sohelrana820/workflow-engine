import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Workflow} from '../entities/workflow.entity';
import {WorkflowExecution} from '../entities/workflow-execution.entity';
import {CreateWorkflowDto} from '../dto/create-workflow.dto';
import {QueueService} from '../../queue/services/queue.service';
import {WorkflowStatus} from '../../common/enums/workflow-status.enum';

@Injectable()
export class WorkflowService {
    constructor(
        @InjectRepository(Workflow)
        private workflowRepository: Repository<Workflow>,
        @InjectRepository(WorkflowExecution)
        private workflowExecutionRepository: Repository<WorkflowExecution>,
        private queueService: QueueService,
    ) {
    }

    async createWorkflow(createWorkflowDto: CreateWorkflowDto) {
        const workflow = new Workflow();
        workflow.workflowId = createWorkflowDto.id;
        workflow.name = createWorkflowDto.name;
        workflow.description = createWorkflowDto.description || '';
        workflow.version = createWorkflowDto.version;
        workflow.status = WorkflowStatus.ACTIVE;
        workflow.metadata = JSON.stringify(createWorkflowDto.metadata);
        workflow.nodes = JSON.stringify(createWorkflowDto.nodes);
        const savedWorkflow = await this.workflowRepository.save(workflow);
        return {id: savedWorkflow.workflowId, status: WorkflowStatus.ACTIVE};
    }

    async updateWorkflow(workflowId: string, createWorkflowDto) {
        // Store workflow metadata
        const workflowObj = {
            workflowId: createWorkflowDto.id,
            name: createWorkflowDto.name,
            description: createWorkflowDto.description,
            version: createWorkflowDto.version,
            status: WorkflowStatus.ACTIVE,
            metadata: JSON.stringify(createWorkflowDto.metadata),
            nodes: JSON.stringify(createWorkflowDto.nodes)
        }

        const updatedWorkflow = await this.workflowRepository.update(
            {id: workflowId}, workflowObj);

        return {id: workflowId, status: WorkflowStatus.ACTIVE};
    }

    async duplicateWorkflow(workflowId: string) {
        const workflowData: Workflow | null = await this.workflowRepository.findOne({where: {id: workflowId}});
        const workflow = new Workflow();
        workflow.workflowId = 'Untitled Workflow - ' + Date.now();
        if (workflowData instanceof Workflow) {
            workflow.name = workflowData.name;
        }
        if (workflowData instanceof Workflow) {
            workflow.description = workflowData.description;
        }
        if (workflowData instanceof Workflow) {
            workflow.version = workflowData.version;
        }
        workflow.status = WorkflowStatus.ACTIVE;
        if (workflowData instanceof Workflow) {
            workflow.metadata = workflowData.metadata;
        }
        if (workflowData instanceof Workflow) {
            workflow.nodes = workflowData.nodes
        }
        const savedWorkflow = await this.workflowRepository.save(workflow);
        return {id: savedWorkflow.workflowId, status: WorkflowStatus.ACTIVE};
    }

    async updateWorkflowStatus(workflowId: string, status: WorkflowStatus) {
        await this.workflowRepository.update({workflowId}, {status});
    }

    async deleteWorkflow(id: string) {
        await this.workflowRepository.delete({id: id});
    }

    async createExecution(workflowId: string, context?: Record<string, any>) {
        const execution = new WorkflowExecution();
        execution.workflowId = workflowId;
        execution.status = WorkflowStatus.PROCESSING;
        execution.context = context ? JSON.stringify(context) : '';
        return this.workflowExecutionRepository.save(execution);
    }

    async getWorkflow(workflowId: string) {
        return this.workflowRepository.findOne({where: {id: workflowId}});
    }

    // Add missing methods
    async getAllWorkflows() {
        return this.workflowRepository.find({
            order: {createdAt: 'DESC'}
        });
    }

    async startWorkflowExecution(workflowId: string, context?: Record<string, any>) {
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow with ID ${workflowId} not found`);
        }

        const execution = await this.createExecution(workflowId, context);
        await this.queueService.sendToQueue('workflow_queue', {
            workflowId,
            workflowExecutionId: execution.id,
            workflow: JSON.parse(workflow.nodes),
            context
        });
        return execution;
    }

    async updateWorkflowExecutionStatus(workflowExecutionId: string, status: WorkflowStatus) {
        const updates: any = {status};

        if (status === WorkflowStatus.COMPLETED || status === WorkflowStatus.FAILED) {
            updates.completedAt = new Date();
        }

        await this.workflowExecutionRepository.update({id: workflowExecutionId}, updates);
    }

    async getWorkflowExecutions(workflowId: string) {
        return this.workflowExecutionRepository.find({
            where: {workflowId},
            order: {startedAt: 'DESC'}
        });
    }
}
