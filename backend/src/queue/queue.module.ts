// src/queue/queue.module.ts
import {forwardRef, Module} from '@nestjs/common';
import {RabbitMQService} from './services/rabbitmq.service';
import {QueueService} from './services/queue.service';
import {WorkflowConsumer} from './consumers/workflow.consumer';
import {StepExecutionConsumer} from './consumers/step-execution.consumer';
import {WorkflowModule} from '../workflow/workflow.module';
import {ActionsModule} from '../actions/actions.module';

@Module({
  imports: [
    forwardRef(() => WorkflowModule),
    ActionsModule,
  ],
  providers: [
    RabbitMQService,
    QueueService,
    WorkflowConsumer,
    StepExecutionConsumer,
  ],
  exports: [QueueService],
})
export class QueueModule {
}
