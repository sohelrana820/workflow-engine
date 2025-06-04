import {ContactData} from "./workflow.dto";

export interface ExecutionResult {
    success: any;
    message: any;
    data: {
        contact: ContactData[];
        executionLog: ExecutionLogEntry[];
    }
}

export interface ExecutionLogEntry {
    nodeId: string;
    type: string;
    status: 'success' | 'failed';
    timestamp: string;
    executionTime?: number;
    error?: string;
}
