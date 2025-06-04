import {Injectable, OnModuleInit} from '@nestjs/common';
import * as amqp from 'amqplib';
import {rabbitmqConfig} from '../../config/rabbitmq.config';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  // Use any type to bypass TypeScript errors
  private connection: any;
  private channel: any;

  async onModuleInit() {
    await this.connect();
  }

  async connect() {
    try {
      // Connect to RabbitMQ
      console.log('Connecting to RabbitMQ at', rabbitmqConfig.uri);
      this.connection = await amqp.connect(rabbitmqConfig.uri);
      this.channel = await this.connection.createChannel();
      // Create queues
      await this.channel.assertQueue(rabbitmqConfig.queues.workflowQueue, {durable: true});
      await this.channel.assertQueue(rabbitmqConfig.queues.workflowExecutionQueue, {durable: true});
      console.log('Connected to RabbitMQ at');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  async sendToQueue(queue: string, message: any) {
    return this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      {persistent: true}
    );
  }

  async consume(queue: string, callback: (message: any) => Promise<void>) {
    if (!this.channel) {
      await this.connect();
    }
    // Ensure the queue exists before consuming
    return this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel.ack(msg);
        } catch (error) {
          console.log('Error processing message:', error);
          this.channel.nack(msg, false, true);
        }
      }
    });
  }
}
