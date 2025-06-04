import {Integration} from './api';

const API_BASE_URL = 'http://localhost:3011';

export interface IntegrationConfig {
    integrationType: string;
    integrationName: string;
    integrationConfig: Record<string, any>;
}

export interface GoogleCalendarConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    accessToken?: string;
    refreshToken?: string;
}

export interface OpenAIConfig {
    apiKey: string;
    organizationId?: string;
    model?: string;
}

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    organizer?: {
        email: string;
        displayName?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus: string;
    }>;
}

export interface GoogleCalendarAuthResponse {
    authUrl: string;
    state: string;
}

export interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
    usage: {
        total_tokens: number;
    };
}

class IntegrationApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<{ data: T; success: boolean; message?: string }> {
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
                const errorData = await response.json().catch(() => ({message: 'Unknown error'}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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

    async initiateGoogleCalendarAuth(config: Partial<GoogleCalendarConfig>): Promise<{
        data: GoogleCalendarAuthResponse;
        success: boolean;
        message?: string;
    }> {
        return this.request<GoogleCalendarAuthResponse>('/integrations/auth', {
            method: 'POST',
            body: JSON.stringify({
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                redirectUri: config.redirectUri || `${window.location.origin}/auth/google-calendar/callback`,
            }),
        });
    }

    async completeGoogleCalendarAuth(
        code: string,
        state: string,
    ): Promise<{
        data: { accessToken: string; refreshToken: string };
        success: boolean;
        message?: string;
    }> {

        const config = {
            clientId: '371908452323-h77596v1oglbiunvp8hvviqfqs224o6g.apps.googleusercontent.com',
            clientSecret: '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',
            redirectUri: 'http://localhost:3012/auth/google-calendar/callback',
        }
        return this.request<{ accessToken: string; refreshToken: string }>('/integrations/auth/token', {
            method: 'POST',
            body: JSON.stringify({
                code,
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                redirectUri: config.redirectUri,
            }),
        });
    }

    async createGoogleCalendarIntegration(config: IntegrationConfig): Promise<{
        data: Integration;
        success: boolean;
        message?: string;
    }> {
        return this.request<Integration>('/integrations', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }

    async getGoogleCalendarEvents(
        integrationId: string,
        timeMin?: string,
        timeMax?: string,
        maxResults?: number
    ): Promise<{
        data: GoogleCalendarEvent[];
        success: boolean;
        message?: string;
    }> {
        const params = new URLSearchParams();
        if (timeMin) params.append('timeMin', timeMin);
        if (timeMax) params.append('timeMax', timeMax);
        if (maxResults) params.append('maxResults', maxResults.toString());

        return this.request<GoogleCalendarEvent[]>(
            `/integrations/google-calendar/${integrationId}/events?${params.toString()}`
        );
    }

    async testGoogleCalendarIntegration(integrationId: string): Promise<{
        data: { status: string; message: string; eventCount?: number };
        success: boolean;
        message?: string;
    }> {
        return this.request<{ status: string; message: string; eventCount?: number }>(
            `/integrations/google-calendar/${integrationId}/test`,
            {method: 'POST'}
        );
    }

    // OpenAI Integration Methods
    async createOpenAIIntegration(config: IntegrationConfig): Promise<{
        data: Integration;
        success: boolean;
        message?: string;
    }> {
        return this.request<Integration>('/integrations', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }

    async testOpenAIIntegration(integrationId: string): Promise<{
        data: { status: string; message: string; model?: string };
        success: boolean;
        message?: string;
    }> {
        return this.request<{ status: string; message: string; model?: string }>(
            `/integrations/openai/${integrationId}/test`,
            {method: 'POST'}
        );
    }

    async callOpenAI(
        integrationId: string,
        prompt: string,
        options?: {
            model?: string;
            maxTokens?: number;
            temperature?: number;
        }
    ): Promise<{
        data: OpenAIResponse;
        success: boolean;
        message?: string;
    }> {
        return this.request<OpenAIResponse>(`/integrations/openai/${integrationId}/chat`, {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                model: options?.model || 'gpt-3.5-turbo',
                maxTokens: options?.maxTokens || 500,
                temperature: options?.temperature || 0.7,
            }),
        });
    }

    // General Integration Methods
    async getAllIntegrations(): Promise<{
        data: any;
        success: boolean;
        message?: string;
    }> {
        return this.request<Integration[]>('/integrations');
    }

    async deleteIntegration(integrationId: string): Promise<{
        data: void;
        success: boolean;
        message?: string;
    }> {
        return this.request<void>(`/integrations/${integrationId}`, {
            method: 'DELETE',
        });
    }

    async updateIntegration(integrationId: string, updates: Partial<IntegrationConfig>): Promise<{
        data: Integration;
        success: boolean;
        message?: string;
    }> {
        return this.request<Integration>(`/integrations/${integrationId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }
}

// Export the client instance
export const integrationApiClient = new IntegrationApiClient(API_BASE_URL);

// Utility functions
export const generateGoogleCalendarRedirectUri = (): string => {
    return `${window.location.origin}/auth/google-calendar/callback`;
};

export const parseGoogleCalendarCallback = (url: string): { code: string; state: string } | null => {
    try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const state = urlObj.searchParams.get('state');

        if (code && state) {
            return {code, state};
        }
        return null;
    } catch {
        return null;
    }
};
