// src/queue/services/queue.service.ts
import {Injectable} from '@nestjs/common';
import {RabbitMQService} from './rabbitmq.service';
import {rabbitmqConfig} from '../../config/rabbitmq.config';

@Injectable()
export class QueueService {
  private readonly queueMap = {
    workflow_queue: rabbitmqConfig.queues.workflowQueue,
    workflow_execution_queue: rabbitmqConfig.queues.workflowExecutionQueue,
  };

  constructor(private readonly rabbitMQService: RabbitMQService) {
  }

  async sendToQueue(queueName: string, message: any) {
    const actualQueueName = this.queueMap[queueName] || queueName;
    return this.rabbitMQService.sendToQueue(actualQueueName, message);
  }

  async consumeFromQueue(queueName: string, callback: (message: any) => Promise<void>) {
    const actualQueueName = this.queueMap[queueName] || queueName;
    return this.rabbitMQService.consume(actualQueueName, callback);
  }
}
