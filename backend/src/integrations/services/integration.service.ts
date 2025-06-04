import {Injectable, NotFoundException, BadRequestException, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Integration, IntegrationType, IntegrationStatus} from '../entities/integration.entity';
import {CreateIntegrationDto, UpdateIntegrationDto, IntegrationResponseDto} from '../dto';

@Injectable()
export class IntegrationService {
    private readonly logger = new Logger(IntegrationService.name);

    constructor(
        @InjectRepository(Integration)
        private readonly integrationRepository: Repository<Integration>,
    ) {
    }

    /**
     * Create a new integration
     */
    async createIntegration(createDto: CreateIntegrationDto): Promise<IntegrationResponseDto> {
        try {
            // Check if integration type already exists
            const existingIntegration = await this.integrationRepository.findOne({
                where: {
                    integrationType: createDto.integrationType,
                },
            });

            if (existingIntegration) {
                throw new BadRequestException(
                    `Integration of type ${createDto.integrationType} already exists. Update the existing integration instead.`
                );
            }

            // Create integration entity
            const integration = this.integrationRepository.create({
                integrationType: createDto.integrationType,
                integrationName: createDto.integrationName,
                integrationConfig: createDto.integrationConfig,
                description: createDto.description,
                isEnabled: createDto.isEnabled ?? true,
                status: IntegrationStatus.ACTIVE,
            });

            const savedIntegration = await this.integrationRepository.save(integration);

            this.logger.log(`✅ Created integration: ${createDto.integrationType} - ${createDto.integrationName}`);

            return this.mapToResponseDto(savedIntegration);
        } catch (error) {
            this.logger.error(`❌ Failed to create integration:`, error);
            throw error;
        }
    }

    /**
     * Get all integrations
     */
    async getAllIntegrations(): Promise<IntegrationResponseDto[]> {
        try {
            const integrations = await this.integrationRepository.find({
                order: {createdAt: 'DESC'},
            });

            return integrations.map(integration => this.mapToResponseDto(integration));
        } catch (error) {
            this.logger.error(`❌ Failed to get integrations:`, error);
            throw error;
        }
    }

    /**
     * Get integration by ID
     */
    async getIntegrationById(id: string): Promise<IntegrationResponseDto> {
        try {
            const integration = await this.integrationRepository.findOne({
                where: {id},
            });

            if (!integration) {
                throw new NotFoundException(`Integration with ID ${id} not found`);
            }

            return this.mapToResponseDto(integration);
        } catch (error) {
            this.logger.error(`❌ Failed to get integration by ID:`, error);
            throw error;
        }
    }

    /**
     * Get integration by type
     */
    async getIntegrationByType(type: IntegrationType): Promise<IntegrationResponseDto | null> {
        try {
            const integration = await this.integrationRepository.findOne({
                where: {integrationType: type},
            });

            return integration ? this.mapToResponseDto(integration) : null;
        } catch (error) {
            this.logger.error(`❌ Failed to get integration by type:`, error);
            throw error;
        }
    }

    /**
     * Update integration
     */
    async updateIntegration(id: string, updateDto: UpdateIntegrationDto): Promise<IntegrationResponseDto> {
        try {
            const integration = await this.integrationRepository.findOne({
                where: {id},
            });

            if (!integration) {
                throw new NotFoundException(`Integration with ID ${id} not found`);
            }

            // Update the integration
            Object.assign(integration, updateDto);

            const updatedIntegration = await this.integrationRepository.save(integration);

            this.logger.log(`✅ Updated integration: ${integration.integrationType} - ${integration.integrationName}`);

            return this.mapToResponseDto(updatedIntegration);
        } catch (error) {
            this.logger.error(`❌ Failed to update integration:`, error);
            throw error;
        }
    }

    /**
     * Delete integration
     */
    async deleteIntegration(id: string): Promise<void> {
        try {
            const integration = await this.integrationRepository.findOne({
                where: {id},
            });

            if (!integration) {
                throw new NotFoundException(`Integration with ID ${id} not found`);
            }

            await this.integrationRepository.remove(integration);

            this.logger.log(`✅ Deleted integration: ${integration.integrationType} - ${integration.integrationName}`);
        } catch (error) {
            this.logger.error(`❌ Failed to delete integration:`, error);
            throw error;
        }
    }

    /**
     * Enable/disable integration
     */
    async toggleIntegration(id: string, isEnabled: boolean): Promise<IntegrationResponseDto> {
        try {
            const integration = await this.integrationRepository.findOne({
                where: {id},
            });

            if (!integration) {
                throw new NotFoundException(`Integration with ID ${id} not found`);
            }

            integration.isEnabled = isEnabled;
            integration.status = isEnabled ? IntegrationStatus.ACTIVE : IntegrationStatus.INACTIVE;

            const updatedIntegration = await this.integrationRepository.save(integration);

            this.logger.log(`✅ ${isEnabled ? 'Enabled' : 'Disabled'} integration: ${integration.integrationType}`);

            return this.mapToResponseDto(updatedIntegration);
        } catch (error) {
            this.logger.error(`❌ Failed to toggle integration:`, error);
            throw error;
        }
    }

    /**
     * Get integration configuration for internal use (with sensitive data)
     */
    async getIntegrationConfig(type: IntegrationType): Promise<Record<string, any> | null> {
        try {
            const integration = await this.integrationRepository.findOne({
                where: {
                    integrationType: type,
                    isEnabled: true,
                    status: IntegrationStatus.ACTIVE,
                },
            });

            return integration ? integration.integrationConfig : null;
        } catch (error) {
            this.logger.error(`❌ Failed to get integration config for ${type}:`, error);
            return null;
        }
    }

    /**
     * Test integration (basic connectivity test)
     */
    async testIntegration(id: string): Promise<any> {
        try {
            const integration = await this.integrationRepository.findOne({
                where: {id},
            });

            if (!integration) {
                throw new NotFoundException(`Integration with ID ${id} not found`);
            }

            // Basic test - just verify config has required fields
            const testResult = this.performBasicTest(integration.integrationType, integration.integrationConfig);

            // Update integration with test results
            integration.lastTestedAt = new Date();

            if (testResult.success) {
                integration.status = IntegrationStatus.ACTIVE;
                integration.lastErrorMessage = null; // Use null instead of undefined
            } else {
                integration.status = IntegrationStatus.ERROR;
                integration.lastErrorMessage = testResult.error || 'Test failed';
            }

            await this.integrationRepository.save(integration);

            this.logger.log(`🧪 Tested integration: ${integration.integrationType} - Result: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);

            return {
                success: testResult.success,
                message: testResult.success ? 'Integration test successful' : 'Integration test failed',
                details: testResult,
                testedAt: integration.lastTestedAt,
            };
        } catch (error) {
            this.logger.error(`❌ Failed to test integration:`, error);
            throw error;
        }
    }

    /**
     * Perform basic configuration test
     */
    private performBasicTest(type: IntegrationType, config: Record<string, any>): { success: boolean; error?: string } {
        try {
            switch (type) {
                case IntegrationType.GOOGLE_CALENDAR:
                    if (!config.clientId || !config.clientSecret) {
                        return {success: false, error: 'Missing clientId or clientSecret'};
                    }
                    break;

                case IntegrationType.OPENAI:
                    if (!config.apiKey) {
                        return {success: false, error: 'Missing apiKey'};
                    }
                    break;

                case IntegrationType.SLACK:
                    if (!config.webhookUrl && !config.botToken) {
                        return {success: false, error: 'Missing webhookUrl or botToken'};
                    }
                    break;

                default:
                    // For other types, just check if config is not empty
                    if (Object.keys(config).length === 0) {
                        return {success: false, error: 'Configuration is empty'};
                    }
            }

            return {success: true};
        } catch (error) {
            return {success: false, error: error.message};
        }
    }

    /**
     * Map entity to response DTO (without sensitive data)
     */
    private mapToResponseDto(integration: Integration): IntegrationResponseDto {
        return {
            id: integration.id,
            integrationType: integration.integrationType,
            integrationName: integration.integrationName,
            status: integration.status,
            description: integration.description,
            lastTestedAt: integration.lastTestedAt,
            lastErrorMessage: integration.lastErrorMessage,
            isEnabled: integration.isEnabled,
            createdAt: integration.createdAt,
            updatedAt: integration.updatedAt,
            configSummary: this.createConfigSummary(integration.integrationType, integration.integrationConfig),
        };
    }

    /**
     * Create non-sensitive config summary for frontend
     */
    private createConfigSummary(type: IntegrationType, config: Record<string, any>): Record<string, any> {
        switch (type) {
            case IntegrationType.GOOGLE_CALENDAR:
                return {
                    hasClientId: !!config.clientId,
                    hasClientSecret: !!config.clientSecret,
                    hasTokens: !!config.accessToken && !!config.refreshToken,
                    redirectUri: config.redirectUri, // Non-sensitive
                    calendarId: config.calendarId, // Non-sensitive
                };

            case IntegrationType.OPENAI:
                return {
                    hasApiKey: !!config.apiKey,
                    organizationId: config.organizationId, // Non-sensitive
                    defaultModel: config.defaultModel || 'gpt-4', // Non-sensitive
                    baseUrl: config.baseUrl, // Non-sensitive
                };

            case IntegrationType.SLACK:
                return {
                    hasWebhookUrl: !!config.webhookUrl,
                    hasBotToken: !!config.botToken,
                    defaultChannel: config.defaultChannel, // Non-sensitive
                };

            default:
                return {
                    configured: Object.keys(config).length > 0,
                    fieldsCount: Object.keys(config).length,
                };
        }
    }
}
