import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {StepExecution} from '../entities/step-execution.entity';
import {ActionResult} from '../entities/action-result.entity';
import {StepStatus} from '../../common/enums/step-status.enum';

@Injectable()
export class StepExecutionService {
    constructor(
        @InjectRepository(StepExecution)
        private stepExecutionRepository: Repository<StepExecution>,
        @InjectRepository(ActionResult)
        private actionResultRepository: Repository<ActionResult>,
    ) {
    }

    async createStepExecution(
        workflowExecutionId: string,
        workflowId: string,
        previousStepId: any,
        step: any
    ) {
        const stepExecution = new StepExecution();
        stepExecution.workflowExecutionId = workflowExecutionId;
        stepExecution.workflowId = workflowId;
        stepExecution.previousStepId = previousStepId;
        stepExecution.stepId = step.id;
        stepExecution.stepType = step.type;
        stepExecution.name = step.name;
        stepExecution.status = StepStatus.QUEUED;
        stepExecution.stepDefinition = JSON.stringify(step);

        return this.stepExecutionRepository.save(stepExecution);
    }

    async updateStepStatus(id: string, status: StepStatus) {
        const updates: any = {status};

        if (status === StepStatus.COMPLETED || status === StepStatus.FAILED) {
            updates.completedAt = new Date();
        }

        await this.stepExecutionRepository.update({id}, updates);
    }

    async saveActionResult(result: any) {
        const actionResult = new ActionResult();
        actionResult.stepExecutionId = result.stepExecutionId;
        actionResult.workflowId = result.workflowId;
        actionResult.previousStepId = result.previousStepId;
        actionResult.stepId = result.stepId;
        actionResult.actionType = result.actionType;
        actionResult.status = result.status;
        actionResult.result = result.result ? JSON.stringify(result.result) : '';

        return this.actionResultRepository.save(actionResult);
    }

    // Add missing methods
    async getStepExecutions(workflowExecutionId: string) {
        return this.stepExecutionRepository.find({
            where: {workflowExecutionId},
            order: {createdAt: 'ASC'}
        });
    }

    async getActionResults(stepId: string) {
        return this.actionResultRepository.find({
            where: {stepId},
            order: {createdAt: 'ASC'}
        });
    }
}
