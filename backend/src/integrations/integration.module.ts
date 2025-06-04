import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {IntegrationController} from './controllers/integration.controller';
import {IntegrationService} from './services/integration.service';
import {Integration} from './entities/integration.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Integration]), // ← Must have this
    ],
    controllers: [IntegrationController], // ← Must have this
    providers: [IntegrationService],
    exports: [IntegrationService],
})
export class IntegrationModule {
}
