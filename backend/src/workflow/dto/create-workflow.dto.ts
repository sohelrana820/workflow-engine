import {IsString, IsObject, IsArray, IsOptional, ValidateNested, IsJSON} from 'class-validator';
import {Type} from 'class-transformer';
import {WorkflowDefinition} from '../../common/interfaces/workflow.interface';

// Define NextStepDto first before using it
export class NextStepDto {
    @IsString()
    id: string;

    @IsString()
    type: string;
}

export class ActionConfigDto {
    @IsObject()
    config: Record<string, any>;
}

export class WorkflowNodeDto {
    @IsString()
    id: string;

    @IsString()
    type: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => NextStepDto) // Now NextStepDto is defined
    next_steps?: NextStepDto[]; // Now NextStepDto is defined

    @IsObject()
    actions: Record<string, ActionConfigDto>;

    @IsOptional()
    @IsObject()
    position?: { x: number; y: number };
}

export class CreateWorkflowDto implements WorkflowDefinition {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    version: string;

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => WorkflowNodeDto)
    nodes: WorkflowNodeDto[];

    @IsJSON()
    metadata: WorkflowNodeDto[];
}
