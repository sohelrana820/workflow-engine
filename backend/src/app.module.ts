import {Module} from '@nestjs/common';
import {WorkflowModule} from './workflow/workflow.module';
import {QueueModule} from "./queue/queue.module";
import {ActionsModule} from "./actions/actions.module";
import {ConfigModule} from '@nestjs/config';
import {TypeOrmModule} from '@nestjs/typeorm';
import {databaseConfig} from './config/database.config';
import {IntegrationModule} from "./integrations/integration.module";

@Module({
    imports: [
        WorkflowModule,
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRoot(databaseConfig),
        WorkflowModule,
        QueueModule,
        ActionsModule,
        IntegrationModule,
    ],
})
export class AppModule {

}
