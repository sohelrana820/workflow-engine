export interface Position {
    x: number;
    y: number;
}

export interface NextStep {
    id: string;
    type: string;
    condition: string;
    input_data: string[];
    conditionType?: 'always' | 'if_empty' | 'if_not_empty' | 'if_equals' | 'if_contains';
    conditionField?: string;
    conditionValue?: string;
    label?: string;
}

export interface ActionConfig {
    name: string;
    config: Record<string, any>;
    output_data?: Record<string, any>;
    outputs?: string[];
}

export interface WorkflowNode {
    id: string;
    type: NodeType;
    name: string;
    actions: Record<string, ActionConfig>;
    next_steps: NextStep[];
    position: Position;
    variables?: Record<string, any>;
    error_handling?: {
        on_failure: string;
        retry_count?: number;
    };
    status?: 'idle' | 'running' | 'completed' | 'failed';
}

export interface Connection {
    id: string;
    sourceId: string;
    targetId: string;
    condition: string;
    input_data: string[];
    label?: string;
    conditionType?: 'always' | 'if_empty' | 'if_not_empty' | 'if_equals' | 'if_contains';
    conditionField?: string;
    conditionValue?: string;
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    version: string;
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'PROCESSING' | 'FAILED' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS';
    nodes: WorkflowNode[] | string;
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}

export type NodeType = 'trigger' | 'enrichment' | 'ai' | 'notification' | 'terminator' | 'fetch';

export interface NodeTypeConfig {
    label: string;
    icon: any;
    color: string;
    actions: Record<string, ActionConfig>;
    description?: string;
}

export interface NodeExecutionResult {
    id: string;
    status: string;
    output: {
        nodeId: string;
        nodeName: string;
        outputData: Record<string, any>;
        passedToNext: Array<{
            targetNodeId: string;
            inputData: string[];
        }>;
    };
    error?: string;
}

export interface ExecutionResult {
    status: 'running' | 'completed' | 'failed';
    execution_id?: string;
    steps_executed?: number;
    execution_time?: string;
    message?: string;
    results?: {
        nodes_processed: NodeExecutionResult[];
    };
    error?: string;
}

export interface WorkflowState {
    nodes: WorkflowNode[];
    connections: Connection[];
    selectedNodeId: string | null;
    scale: number;
    canvasOffset: Position;
    workflowName: string;
    isDirty: boolean;
}

export interface DragState {
    isDragging: boolean;
    dragType: 'node' | 'canvas' | 'connection' | null;
    dragStart: Position;
    connectionStart: string | null;
}

export interface SaveWorkflowRequest {
    workflow: Workflow;
}

export interface ExecuteWorkflowRequest {
    workflowId: string;
    inputs?: Record<string, any>;
}

export interface WorkflowListResponse {
    workflows: Workflow[];
    total: number;
    page: number;
    pageSize: number;
}

export interface NodeDragEvent {
    nodeId: string;
    position: Position;
}

export interface ConnectionCreateEvent {
    sourceId: string;
    targetId: string;
    condition?: string;
    input_data?: string[];
}

export interface NodeUpdateEvent {
    nodeId: string;
    updates: Partial<WorkflowNode>;
}
