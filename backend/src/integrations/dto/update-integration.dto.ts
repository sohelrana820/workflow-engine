import {PartialType} from '@nestjs/mapped-types';
import {IsOptional, IsString, IsEnum} from 'class-validator';
import {IntegrationStatus} from '../entities/integration.entity';
import {CreateIntegrationDto} from './create-integration.dto';

export class UpdateIntegrationDto extends PartialType(CreateIntegrationDto) {
    @IsOptional()
    @IsEnum(IntegrationStatus)
    status?: IntegrationStatus;

    @IsOptional()
    @IsString()
    lastErrorMessage?: string;
}
