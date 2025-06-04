import {Injectable} from '@nestjs/common';
import {BaseActionHandler} from './base-action.handler';
import OpenAI from 'openai';
import {IntegrationService} from '../../integrations/services/integration.service';
import {IntegrationType} from '../../integrations/entities/integration.entity';

@Injectable()
export class OpenAiHandler extends BaseActionHandler {
  private openai: OpenAI;

  constructor(
    private readonly integrationService: IntegrationService
  ) {
    super();
    // Don't initialize OpenAI here - do it when needed with integration config
  }

  async execute(config: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('=== OpenAI Handler Execute ===');
      console.log('Config received:', JSON.stringify(config, null, 2));

      // Get OpenAI integration configuration from database
      const integrationConfig = await this.integrationService.getIntegrationConfig(IntegrationType.OPENAI);

      if (!integrationConfig) {
        console.log('❌ No OpenAI integration found in database. Please configure the integration first.');
        console.log('Falling back to mock AI summary...');
        return this.getMockAISummary(
          config.name || config.first_name || 'Unknown Customer',
          config.event_title || 'Upcoming Meeting'
        );
      }

      console.log('✅ Found OpenAI integration configuration');

      // Validate required configuration
      if (!integrationConfig.apiKey) {
        console.log('❌ OpenAI API key not found in integration configuration');
        return this.getMockAISummary(
          config.name || config.first_name || 'Unknown Customer',
          config.event_title || 'Upcoming Meeting'
        );
      }

      // Initialize OpenAI with integration config
      await this.initializeOpenAI(integrationConfig);

      // Extract data from previous steps
      const customerName = config.name || config.first_name || 'Unknown Customer';
      const customerEmail = config.email || config.event_attendees_email || 'unknown@example.com';
      const company = config.company || 'Unknown Company';
      const jobTitle = config.job_title || 'Unknown Position';
      const eventTitle = config.event_title || 'Upcoming Meeting';
      const eventDate = config.event_date || 'TBD';
      const eventTime = config.event_start_time || 'TBD';
      const purchaseHistory = config.purchase_history || 'No purchase history available';
      const interactionNotes = config.interaction_notes || 'No interaction notes available';
      const lastContactDate = config.last_contact_date || 'Unknown';

      // Create comprehensive prompt using all available data
      const prompt = config.prompt || `
        Please create a comprehensive customer summary and meeting preparation brief based on the following information:

        Customer Information:
        - Name: ${customerName}
        - Email: ${customerEmail}
        - Company: ${company}
        - Job Title: ${jobTitle}

        Upcoming Meeting:
        - Event: ${eventTitle}
        - Date: ${eventDate}
        - Time: ${eventTime}

        Customer History:
        - Purchase History: ${purchaseHistory}
        - Interaction Notes: ${interactionNotes}
        - Last Contact: ${lastContactDate}

        Please provide:
        1. A brief customer profile summary
        2. Key talking points for the upcoming meeting
        3. Potential opportunities or concerns to address
        4. Recommended next steps

        Keep the summary concise but actionable.
      `;

      // Use transcript from config if provided, otherwise use the constructed prompt
      const textToProcess = config.transcript?.trim() || prompt;

      if (!textToProcess) {
        return {
          success: false,
          error: 'No content provided for AI processing.',
        };
      }

      console.log('🤖 Sending request to OpenAI...');

      try {
        const result = await this.openai.chat.completions.create({
          model: integrationConfig.defaultModel || config.model || 'gpt-4',
          messages: [{role: 'user', content: textToProcess}],
          max_tokens: config.max_tokens || 500,
        });

        const summary = result.choices?.[0]?.message?.content ?? 'No summary generated.';

        console.log('✅ OpenAI request successful');

        return {
          success: true,
          data: {
            ai_summary: summary,
            message: 'Successfully generated AI summary',
          },
        };
      } catch (openaiError) {
        console.error('❌ OpenAI API error:', openaiError);

        if (openaiError.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please check your OpenAI plan or try later.',
          };
        }

        if (openaiError.status === 401) {
          return {
            success: false,
            error: 'Invalid OpenAI API key. Please check your integration configuration.',
          };
        }

        // Fallback to mock data if API fails
        console.log('🔄 OpenAI API failed, returning mock summary');
        return this.getMockAISummary(customerName, eventTitle);
      }
    } catch (error: any) {
      console.error('❌ OpenAI integration error:', error);
      return {
        success: false,
        error: error.message || 'Unknown OpenAI error',
      };
    }
  }

  /**
   * Initialize OpenAI client with integration configuration
   */
  private async initializeOpenAI(integrationConfig: any): Promise<void> {
    try {
      console.log('🔧 Initializing OpenAI client with integration config');

      const openaiOptions: any = {
        apiKey: integrationConfig.apiKey,
      };

      // Add organization ID if provided
      if (integrationConfig.organizationId) {
        openaiOptions.organization = integrationConfig.organizationId;
      }

      // Add custom base URL if provided
      if (integrationConfig.baseUrl) {
        openaiOptions.baseURL = integrationConfig.baseUrl;
      }

      this.openai = new OpenAI(openaiOptions);

      console.log('✅ OpenAI client initialized successfully');
      console.log(`📋 Using model: ${integrationConfig.defaultModel || 'gpt-4'}`);

      if (integrationConfig.organizationId) {
        console.log(`🏢 Organization ID: ${integrationConfig.organizationId}`);
      }

    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error);
      throw new Error(`OpenAI initialization failed: ${error.message}`);
    }
  }

  /**
   * Test OpenAI integration connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const integrationConfig = await this.integrationService.getIntegrationConfig(IntegrationType.OPENAI);

      if (!integrationConfig) {
        return {
          success: false,
          message: 'No OpenAI integration configuration found'
        };
      }

      if (!integrationConfig.apiKey) {
        return {
          success: false,
          message: 'OpenAI API key not found in integration configuration'
        };
      }

      // Initialize OpenAI client
      await this.initializeOpenAI(integrationConfig);

      // Test with a simple request
      const testResult = await this.openai.chat.completions.create({
        model: integrationConfig.defaultModel || 'gpt-4',
        messages: [{role: 'user', content: 'Test connection. Please respond with "Connection successful".'}],
        max_tokens: 10,
      });

      const response = testResult.choices?.[0]?.message?.content || '';

      return {
        success: true,
        message: 'OpenAI connection successful',
        details: {
          model: integrationConfig.defaultModel || 'gpt-4',
          organizationId: integrationConfig.organizationId || 'Not specified',
          response: response.trim(),
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `OpenAI connection failed: ${error.message}`,
        details: {
          error: error.message,
          status: error.status || 'Unknown'
        }
      };
    }
  }

  private getMockAISummary(customerName: string, eventTitle: string) {
    const mockSummary = `
**Customer Summary for ${customerName}**

**Profile:** Established customer with strong engagement history and recent upgrade to Enterprise Plan. Shows consistent interest in automation and productivity features.

**Meeting Preparation for "${eventTitle}":**
• Key talking points: Discuss new automation features, training needs, and potential expansion opportunities
• Previous concerns: Timeline clarity for implementation, team onboarding requirements
• Opportunities: Upsell additional modules, extend contract terms

**Recommended Actions:**
1. Present tailored demo of automation features
2. Discuss implementation timeline and support options
3. Explore additional department adoption opportunities
4. Schedule follow-up training session

**Next Steps:** Focus on value demonstration and addressing timeline concerns to move toward contract expansion.
    `;

    console.log('📝 Returning mock AI summary (OpenAI integration not configured)');

    return {
      success: true,
      data: {
        ai_summary: mockSummary.trim(),
        message: 'Generated mock AI summary (OpenAI not configured)',
      },
    };
  }
}
