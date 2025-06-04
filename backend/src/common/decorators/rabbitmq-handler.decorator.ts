import {SetMetadata} from '@nestjs/common';

export const RABBITMQ_HANDLER = 'rabbitmq_handler';

export const RabbitmqHandler = (queue: string) => SetMetadata(RABBITMQ_HANDLER, queue);
