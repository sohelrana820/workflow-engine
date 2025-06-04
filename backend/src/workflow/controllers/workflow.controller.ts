import {Controller, Post, Get, Body, Param, Query, Put, Delete} from '@nestjs/common';
import {WorkflowService} from '../services/workflow.service';
import {StepExecutionService} from '../services/step-execution.service';
import {CreateWorkflowDto} from '../dto/create-workflow.dto';

@Controller('workflows')
export class WorkflowController {
    constructor(
        private readonly workflowService: WorkflowService,
        private readonly stepExecutionService: StepExecutionService
    ) {
    }

    @Post()
    async createWorkflow(@Body() createWorkflowDto: CreateWorkflowDto) {
        return this.workflowService.createWorkflow(createWorkflowDto);
    }

    @Put(':id')
    async updateWorkflow(
        @Param('id') id: string,
        @Body() createWorkflowDto: CreateWorkflowDto
    ) {
        return this.workflowService.updateWorkflow(id, createWorkflowDto);
    }

    @Delete(':id')
    async deleteWorkflow(
        @Param('id') id: string,
    ) {
        const deleted = await this.workflowService.deleteWorkflow(id);
        return {
            success: true,
            message: 'Workflow has been successfully',
            data: deleted
        }
    }

    @Get()
    async getAllWorkflows() {
        const workflows = await this.workflowService.getAllWorkflows();
        return {
            success: true,
            message: 'Workflow list',
            workflows: workflows
        }
    }

    @Get(':id')
    async getWorkflow(@Param('id') id: string) {
        const workflow = await this.workflowService.getWorkflow(id);
        return {
            success: true,
            message: 'Workflow details',
            data: workflow
        }
    }

    @Post(':id/execute')
    async executeWorkflow(
        @Param('id') id: string,
        @Body() context?: Record<string, any>
    ) {
        return this.workflowService.startWorkflowExecution(id, context);
    }

    @Post(':id/duplicate')
    async duplicateWorkflow(
        @Param('id') id: string,
        @Body() context?: Record<string, any>
    ) {
        const created = await this.workflowService.duplicateWorkflow(id);
        return {
            success: true,
            message: 'Workflow has been copied',
            data: created
        }
    }

    @Get(':id/executions')
    async getWorkflowExecutions(@Param('id') id: string) {
        return this.workflowService.getWorkflowExecutions(id);
    }

    @Get('executions/:executionId/steps')
    async getStepExecutions(@Param('executionId') executionId: string) {
        return this.stepExecutionService.getStepExecutions(executionId);
    }

    @Get('steps/:stepId/results')
    async getActionResults(@Param('stepId') stepId: string) {
        return this.stepExecutionService.getActionResults(stepId);
    }
}
