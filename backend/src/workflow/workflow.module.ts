import {Module, forwardRef} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {WorkflowController} from './controllers/workflow.controller';
import {WorkflowService} from './services/workflow.service';
import {StepExecutionService} from './services/step-execution.service';
import {ConditionEvaluatorService} from './services/condition-evaluator.service';
import {RetryFailureHandlerService} from './services/retry-failure-handler.service';
import {WorkflowMonitoringService} from './services/workflow-monitoring.service';
import {Workflow} from './entities/workflow.entity';
import {WorkflowExecution} from './entities/workflow-execution.entity';
import {StepExecution} from './entities/step-execution.entity';
import {ActionResult} from './entities/action-result.entity';
import {QueueModule} from '../queue/queue.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Workflow,
            WorkflowExecution,
            StepExecution,
            ActionResult,
        ]),
        forwardRef(() => QueueModule),
    ],
    controllers: [WorkflowController],
    providers: [
        WorkflowService,
        StepExecutionService,
        ConditionEvaluatorService,
        RetryFailureHandlerService,
        WorkflowMonitoringService,
    ],
    exports: [
        WorkflowService,
        StepExecutionService,
        ConditionEvaluatorService,
        RetryFailureHandlerService,
        WorkflowMonitoringService,
    ],
})
export class WorkflowModule {
}
