import {IsString, IsOptional, IsObject} from 'class-validator';

export class WorkflowExecutionDto {
    @IsString()
    workflowId: string;

    @IsObject()
    workflow: any;

    @IsObject()
    @IsOptional()
    context?: Record<string, any>;
}
