import {EntityRepository, Repository} from 'typeorm';
import {Workflow} from '../entities/workflow.entity';
import {WorkflowExecution} from '../entities/workflow-execution.entity';
import {StepExecution} from '../entities/step-execution.entity';
import {ActionResult} from '../entities/action-result.entity';

@EntityRepository(Workflow)
export class WorkflowRepository extends Repository<Workflow> {
}

@EntityRepository(WorkflowExecution)
export class WorkflowExecutionRepository extends Repository<WorkflowExecution> {
}

@EntityRepository(StepExecution)
export class StepExecutionRepository extends Repository<StepExecution> {
}

@EntityRepository(ActionResult)
export class ActionResultRepository extends Repository<ActionResult> {
}
