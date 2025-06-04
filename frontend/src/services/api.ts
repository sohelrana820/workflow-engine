import {Workflow} from '../types/workflow';

const API_BASE_URL = 'http://localhost:3011';

interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

interface WorkflowListResponse {
    workflows: Workflow[];
    total: number;
    page: number;
    pageSize: number;
}

interface Integration {
    id: string;
    name: string;
    integrationType: string;
    description: string;
    icon: string;
    status: 'connected' | 'disconnected' | 'error';
    config?: Record<string, any>;
    capabilities: string[];
    category: 'crm' | 'calendar' | 'communication' | 'ai' | 'database' | 'other';
}

class ApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseURL}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers: defaultHeaders,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                data,
                success: true,
            };
        } catch (error) {
            console.error('API request failed:', error);
            return {
                data: null as T,
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async getWorkflows(page = 1, pageSize = 10): Promise<ApiResponse<WorkflowListResponse>> {
        return this.request<WorkflowListResponse>(`/workflows?page=${page}&pageSize=${pageSize}`);
    }

    async getWorkflow(id: string): Promise<any> {
        return this.request<Workflow>(`/workflows/${id}`);
    }

    async createWorkflow(workflow: any): Promise<ApiResponse<Workflow>> {
        return this.request<Workflow>('/workflows', {
            method: 'POST',
            body: JSON.stringify(workflow),
        });
    }

    async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<ApiResponse<Workflow>> {
        return this.request<Workflow>(`/workflows/${id}`, {
            method: 'PUT',
            body: JSON.stringify(workflow),
        });
    }

    async deleteWorkflow(id: string): Promise<ApiResponse<void>> {
        return this.request<void>(`/workflows/${id}`, {
            method: 'DELETE',
        });
    }

    async duplicateWorkflow(id: string): Promise<ApiResponse<Workflow>> {
        return this.request<Workflow>(`/workflows/${id}/duplicate`, {
            method: 'POST',
        });
    }

    async executeWorkflow(id: string, inputs?: Record<string, any>): Promise<ApiResponse<any>> {
        return this.request<any>(`/workflows/${id}/execute`, {
            method: 'POST',
            body: JSON.stringify({inputs}),
        });
    }

    async getIntegrations(): Promise<ApiResponse<Integration[]>> {
        return this.request<Integration[]>('/integrations');
    }

    async connectIntegration(type: string, config: Record<string, any>): Promise<ApiResponse<Integration>> {
        return this.request<Integration>('/integrations/connect', {
            method: 'POST',
            body: JSON.stringify({type, config}),
        });
    }

    async disconnectIntegration(id: string): Promise<ApiResponse<void>> {
        return this.request<void>(`/integrations/${id}/disconnect`, {
            method: 'DELETE',
        });
    }

    async testIntegration(id: string): Promise<ApiResponse<{ status: string; message: string }>> {
        return this.request<{ status: string; message: string }>(`/integrations/${id}/test`, {
            method: 'POST',
        });
    }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type {ApiResponse, WorkflowListResponse, Integration};
