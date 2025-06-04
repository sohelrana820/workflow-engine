export interface WorkflowNode {
    id: string;
    type: string;
    name: string;
    next_steps?: Array<{
        id: string;
        type: string;
    }>;
    actions: Record<string, {
        config: any;
    }>;
    position?: {
        x: number;
        y: number;
    };
}

export interface WorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    version: string;
    nodes: WorkflowNode[];
}
