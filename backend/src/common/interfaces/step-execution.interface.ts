export interface StepExecution {
    workflowId: string;
    stepId: string;
    type: string;
    status: string;
    actions: Record<string, any>;
    results?: Record<string, any>;
}
