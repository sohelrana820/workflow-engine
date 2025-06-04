import * as dotenv from 'dotenv';

dotenv.config();

export const rabbitmqConfig = {
    uri: process.env.RABBITMQ_URI,
    queues: {
        workflowQueue: 'workflow_queue',
        workflowExecutionQueue: 'workflow_execution_queue',
    },
};
