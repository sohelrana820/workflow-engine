import * as dotenv from 'dotenv';

dotenv.config();

import {TypeOrmModuleOptions} from '@nestjs/typeorm';
import {Workflow} from '../workflow/entities/workflow.entity';
import {WorkflowExecution} from '../workflow/entities/workflow-execution.entity';
import {StepExecution} from '../workflow/entities/step-execution.entity';
import {ActionResult} from '../workflow/entities/action-result.entity';
import {Integration} from '../integrations/entities/integration.entity';

const requiredEnv = [
    'POSTGRES_DB_TYPE',
    'POSTGRES_DB_HOST',
    'POSTGRES_DB_USER',
    'POSTGRES_DB_PASS',
    'POSTGRES_DB_NAME',
];

requiredEnv.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

export const databaseConfig: TypeOrmModuleOptions = {
    type: process.env.POSTGRES_DB_TYPE as 'postgres',
    host: process.env.POSTGRES_DB_HOST!,
    port: parseInt(process.env.POSTGRES_DB_PORT || '5432', 10),
    username: process.env.POSTGRES_DB_USER!,
    password: process.env.POSTGRES_DB_PASS!,
    database: process.env.POSTGRES_DB_NAME!,
    entities: [
        Workflow,
        WorkflowExecution,
        StepExecution,
        ActionResult,
        Integration, // Add this
    ],
    synchronize: process.env.NODE_ENV !== 'production',
    autoLoadEntities: true,
    logging: false,
};
