import {IntegrationType, IntegrationStatus} from '../entities/integration.entity';

export class IntegrationResponseDto {
    id: string;
    integrationType: IntegrationType;
    integrationName: string;
    status: IntegrationStatus;
    description?: string;
    lastTestedAt?: Date;
    lastErrorMessage?: string | null;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    configSummary?: Record<string, any>;
}
