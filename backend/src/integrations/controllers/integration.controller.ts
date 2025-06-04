import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpStatus,
    HttpCode,
    ValidationPipe,
    ParseUUIDPipe,
    ParseBoolPipe,
} from '@nestjs/common';
import {IntegrationService} from '../services/integration.service';
import {
    CreateIntegrationDto,
    UpdateIntegrationDto,
    IntegrationResponseDto
} from '../dto';
import {IntegrationType} from '../entities/integration.entity';
import {google} from 'googleapis';
import {OAuth2Client} from 'google-auth-library';

@Controller('integrations')
export class IntegrationController {
    constructor(private readonly integrationService: IntegrationService) {
    }

    private oauth2Client: OAuth2Client;

    /**
     * Create a new integration
     * POST /integrations
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createIntegration(
        @Body(ValidationPipe) createDto: CreateIntegrationDto
    ): Promise<{
        success: boolean;
        message: string;
        data: IntegrationResponseDto;
    }> {
        const integration = await this.integrationService.createIntegration(createDto);

        return {
            success: true,
            message: 'Integration created successfully',
            data: integration,
        };
    }

    /**
     * Get all integrations
     * GET /integrations
     */
    @Get()
    async getAllIntegrations(): Promise<{
        success: boolean;
        message: string;
        data: IntegrationResponseDto[];
    }> {
        const integrations = await this.integrationService.getAllIntegrations();

        return {
            success: true,
            message: 'Integrations retrieved successfully',
            data: integrations,
        };
    }

    /**
     * Get integration by ID
     * GET /integrations/:id
     */
    @Get(':id')
    async getIntegrationById(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<{
        success: boolean;
        message: string;
        data: IntegrationResponseDto;
    }> {
        const integration = await this.integrationService.getIntegrationById(id);

        return {
            success: true,
            message: 'Integration retrieved successfully',
            data: integration,
        };
    }

    /**
     * Get integration by type
     * GET /integrations/type/:type
     */
    @Get('type/:type')
    async getIntegrationByType(
        @Param('type') type: IntegrationType
    ): Promise<{
        success: boolean;
        message: string;
        data: IntegrationResponseDto | null;
    }> {
        const integration = await this.integrationService.getIntegrationByType(type);

        return {
            success: true,
            message: integration
                ? 'Integration retrieved successfully'
                : 'No integration found for this type',
            data: integration,
        };
    }

    /**
     * Update integration
     * PUT /integrations/:id
     */
    @Put(':id')
    async updateIntegration(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(ValidationPipe) updateDto: UpdateIntegrationDto
    ): Promise<{
        success: boolean;
        message: string;
        data: IntegrationResponseDto;
    }> {
        const integration = await this.integrationService.updateIntegration(id, updateDto);

        return {
            success: true,
            message: 'Integration updated successfully',
            data: integration,
        };
    }

    /**
     * Delete integration
     * DELETE /integrations/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteIntegration(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        await this.integrationService.deleteIntegration(id);

        return {
            success: true,
            message: 'Integration deleted successfully',
        };
    }

    /**
     * Enable/Disable integration
     * PATCH /integrations/:id/toggle
     */
    @Put(':id/toggle')
    async toggleIntegration(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('isEnabled', ParseBoolPipe) isEnabled: boolean
    ): Promise<{
        success: boolean;
        message: string;
        data: IntegrationResponseDto;
    }> {
        const integration = await this.integrationService.toggleIntegration(id, isEnabled);

        return {
            success: true,
            message: `Integration ${isEnabled ? 'enabled' : 'disabled'} successfully`,
            data: integration,
        };
    }

    /**
     * Test integration connection
     * POST /integrations/:id/test
     */
    @Post(':id/test')
    async testIntegration(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<{
        success: boolean;
        message: string;
        data: any;
    }> {
        const testResult = await this.integrationService.testIntegration(id);

        return {
            success: testResult.success,
            message: testResult.message,
            data: testResult,
        };
    }

    /**
     * Get available integration types with their schemas
     * GET /integrations/types/available
     */
    @Get('types/available')
    async getAvailableIntegrationTypes(): Promise<{
        success: boolean;
        message: string;
        data: any[];
    }> {
        const types = [
            {
                type: IntegrationType.GOOGLE_CALENDAR,
                displayName: 'Google Calendar',
                description: 'Connect to Google Calendar to read events and schedule meetings',
                configFields: [
                    {name: 'clientId', label: 'Client ID', type: 'text', required: true},
                    {name: 'clientSecret', label: 'Client Secret', type: 'password', required: true},
                    {name: 'redirectUri', label: 'Redirect URI', type: 'text', required: true},
                    {name: 'accessToken', label: 'Access Token', type: 'password', required: false},
                    {name: 'refreshToken', label: 'Refresh Token', type: 'password', required: false},
                    {name: 'calendarId', label: 'Calendar ID', type: 'text', required: false, default: 'primary'},
                ],
            },
            {
                type: IntegrationType.OPENAI,
                displayName: 'OpenAI',
                description: 'Connect to OpenAI API for AI-powered text generation and analysis',
                configFields: [
                    {name: 'apiKey', label: 'API Key', type: 'password', required: true},
                    {name: 'organizationId', label: 'Organization ID', type: 'text', required: false},
                    {name: 'defaultModel', label: 'Default Model', type: 'text', required: false, default: 'gpt-4'},
                    {
                        name: 'baseUrl',
                        label: 'Base URL',
                        type: 'text',
                        required: false,
                        default: 'https://api.openai.com/v1'
                    },
                ],
            },
            {
                type: IntegrationType.SLACK,
                displayName: 'Slack',
                description: 'Send notifications and messages to Slack channels',
                configFields: [
                    {name: 'webhookUrl', label: 'Webhook URL', type: 'text', required: false},
                    {name: 'botToken', label: 'Bot Token', type: 'password', required: false},
                    {
                        name: 'defaultChannel',
                        label: 'Default Channel',
                        type: 'text',
                        required: false,
                        default: '#general'
                    },
                ],
            },
            {
                type: IntegrationType.CRM,
                displayName: 'CRM API',
                description: 'Connect to your CRM system for customer data',
                configFields: [
                    {name: 'apiUrl', label: 'API URL', type: 'text', required: true},
                    {name: 'apiKey', label: 'API Key', type: 'password', required: true},
                    {name: 'apiVersion', label: 'API Version', type: 'text', required: false, default: 'v1'},
                ],
            },
            {
                type: IntegrationType.EMAIL,
                displayName: 'Email Service',
                description: 'Send emails through SMTP or email service providers',
                configFields: [
                    {name: 'smtpHost', label: 'SMTP Host', type: 'text', required: true},
                    {name: 'smtpPort', label: 'SMTP Port', type: 'number', required: true, default: 587},
                    {name: 'username', label: 'Username', type: 'text', required: true},
                    {name: 'password', label: 'Password', type: 'password', required: true},
                    {name: 'fromEmail', label: 'From Email', type: 'email', required: true},
                ],
            },
            {
                type: IntegrationType.WEBHOOK,
                displayName: 'Webhook',
                description: 'Send HTTP requests to external services',
                configFields: [
                    {name: 'url', label: 'Webhook URL', type: 'text', required: true},
                    {
                        name: 'method',
                        label: 'HTTP Method',
                        type: 'select',
                        required: true,
                        default: 'POST',
                        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
                    },
                    {name: 'headers', label: 'Headers (JSON)', type: 'textarea', required: false},
                    {name: 'authToken', label: 'Auth Token', type: 'password', required: false},
                ],
            },
            {
                type: IntegrationType.API,
                displayName: 'Generic API',
                description: 'Connect to any REST API service',
                configFields: [
                    {name: 'baseUrl', label: 'Base URL', type: 'text', required: true},
                    {name: 'apiKey', label: 'API Key', type: 'password', required: false},
                    {
                        name: 'authType',
                        label: 'Auth Type',
                        type: 'select',
                        required: false,
                        options: ['none', 'api-key', 'bearer', 'basic']
                    },
                    {name: 'headers', label: 'Default Headers (JSON)', type: 'textarea', required: false},
                ],
            },
        ];

        return {
            success: true,
            message: 'Available integration types retrieved successfully',
            data: types,
        };
    }

    @Post('auth')
    async initiateAuth(@Body() clientInfo: { clientId: string, clientSecret: string, redirectUri: string }) {
        this.oauth2Client = new google.auth.OAuth2(
            clientInfo.clientId,
            clientInfo.clientSecret,
            clientInfo.redirectUri
        );

        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/calendar.events.readonly'
            ],
            prompt: 'consent',
        });

        return {
            success: true,
            message: 'oAuth URL generated successfully',
            data: {
                authUrl: authUrl,
                state: 'auth'
            }
        };
    }

    @Post('auth/token')
    async initiateAuthToken(@Body() clientInfo: {
        code: string,
        clientId: string,
        clientSecret: string,
        redirectUri: string
    }) {
        this.oauth2Client = new google.auth.OAuth2(
            clientInfo.clientId,
            clientInfo.clientSecret,
            clientInfo.redirectUri
        );
        const {tokens} = await this.oauth2Client.getToken(clientInfo.code);
        const googleIntegration: CreateIntegrationDto = {
            integrationType: IntegrationType.GOOGLE_CALENDAR,  // Assuming this is a valid enum value
            integrationName: "My Calendar",
            integrationConfig: {
                clientId: clientInfo.clientId,
                clientSecret: clientInfo.clientSecret,
                redirectUri: clientInfo.redirectUri,
                accessToken: tokens.access_token ?? '',
                refreshToken: tokens.refresh_token ?? ''
            },
            description: "Google Calendar integration",
            isEnabled: true
        };

        const integration = await this.integrationService.createIntegration(googleIntegration);

        if (integration) {
            return {
                success: true,
                message: 'Google calender integration created successfully',
            };
        }
    }
}
