import {IsString, IsEnum, IsObject, IsOptional, IsBoolean} from 'class-validator';
import {IntegrationType} from '../entities/integration.entity';

export class CreateIntegrationDto {
    @IsEnum(IntegrationType)
    integrationType: IntegrationType;

    @IsString()
    integrationName: string;

    @IsObject()
    integrationConfig: Record<string, any>;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;
}
