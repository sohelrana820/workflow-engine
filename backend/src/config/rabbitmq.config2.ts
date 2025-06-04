import {RmqEnum} from "./../common/enums";

export const RabbitmqConfig = () => {
    let rabbitmqProtocol = 'amqp';
    if (process.env.RABBITMQ_TLS_ENABLE === 'true') {
        rabbitmqProtocol = 'amqps';
    }

    const dsnUrl = `${rabbitmqProtocol}://${process.env.RABBITMQ_USER}:${encodeURIComponent(
        process.env.RABBITMQ_PASSWORD || '',
    )}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST}`;

    return {
        rmq: {
            host: process.env.RABBITMQ_HOST,
            port: process.env.RABBITMQ_PORT,
            user: process.env.RABBITMQ_USER,
            password: process.env.RABBITMQ_PASSWORD,
            tlsEnable: process.env.RABBITMQ_TLS_ENABLE || 'false',
            vHost: process.env.RABBITMQ_VHOST || 'false',
            dsnUrl: process.env.RABBITMQ_DSN_URL || dsnUrl,
            tlsCertFile: process.env.RABBITMQ_TLS_CERT_FILE,
            tlsPrivateKey: process.env.RABBITMQ_TLS_PRIVATE_KEY,
            tlsCaFile: process.env.RABBITMQ_TLS_CA_FILE,
            tlsRejectUnauthorised:
                process.env.RABBITMQ_TLS_REJECT_UNAUTHORISED || 'true',
            prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH_COUNT || '10'),
            heartbeatInterval: parseInt(
                process.env.RABBITMQ_HEARTBEAT_INTERVAL || '60',
            ),
            maxRetry: parseInt(process.env.RABBITMQ_MAX_RETRY || '10'),
            queueData: {
                exchanges: [
                    {
                        name: RmqEnum.WORKFLOW_EXECUTION_EXCHANGE,
                        type: 'direct',
                        durable: true,
                        autoDelete: false,
                    },
                    {
                        name: RmqEnum.WORKFLOW_EXECUTION_DLX_EXCHANGE,
                        type: 'direct',
                        durable: true,
                        autoDelete: false,
                    },
                    {
                        name: RmqEnum.WORKFLOW_INVOKER_EXCHANGE,
                        type: 'direct',
                        durable: true,
                        autoDelete: false,
                    },
                ],
                queues: [
                    {
                        name: RmqEnum.WORKFLOW_EXECUTION_QUEUE,
                        durable: true,
                        type: 'quorum',
                        deliveryLimit: parseInt(
                            process.env.RABBITMQ_DELIVERY_LIMIT || '1',
                        ),
                        delay: true,
                        dlx: RmqEnum.WORKFLOW_EXECUTION_DLX_EXCHANGE,
                        routingKey: RmqEnum.WORKFLOW_EXECUTION_DLX_ROUTING,
                    },
                    {
                        name: RmqEnum.WORKFLOW_INVOKER_QUEUE,
                        durable: true,
                        type: 'quorum',
                        deliveryLimit: parseInt(
                            process.env.RABBITMQ_DELIVERY_LIMIT || '1',
                        ),
                        delay: true,
                    },
                ],
                delayQueues: [
                    {
                        name: RmqEnum.WORKFLOW_EXECUTION_DLX_QUEUE,
                        durable: true,
                        dlx: RmqEnum.WORKFLOW_EXECUTION_EXCHANGE,
                        routingKey: RmqEnum.WORKFLOW_EXECUTION_ROUTING,
                        messageTtl: parseInt(process.env.RABBITMQ_MESSAGE_TTL || '10000'),
                    },
                ],
                queueBindings: [
                    {
                        queue: RmqEnum.WORKFLOW_EXECUTION_QUEUE,
                        exchange: RmqEnum.WORKFLOW_EXECUTION_EXCHANGE,
                        routingKey: RmqEnum.WORKFLOW_EXECUTION_ROUTING,
                    },
                    {
                        queue: RmqEnum.WORKFLOW_INVOKER_QUEUE,
                        exchange: RmqEnum.WORKFLOW_INVOKER_EXCHANGE,
                        routingKey: RmqEnum.WORKFLOW_INVOKER_ROUTING,
                    },
                ],
            },
        },
    };
};
