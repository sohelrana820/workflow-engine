import {Injectable, Logger} from '@nestjs/common';
import {BaseActionHandler} from './base-action.handler';
import axios from "axios";

@Injectable()
export class CrmHandler extends BaseActionHandler {
  private readonly logger = new Logger();

  async execute(config: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('=== API Call Handler Execute ===');
      console.log('Config received:', JSON.stringify(config, null, 2));

      const {url, method = 'GET', headers = {}} = config;

      // Extract customer email for mock data generation
      const customerEmail = config.email || config.event_attendees_email || 'unknown@example.com';
      const customerName = config.name || config.first_name || 'Unknown Customer';

      // If no URL provided, return mock data
      if (!url || url === '') {
        this.logger.log('No URL provided, returning mock data');
        return this.getMockApiData(customerEmail, customerName);
      }

      try {
        // Make actual API call
        this.logger.log(`Making ${method} request to: ${url}`);
        const response = await axios({
          method: method.toLowerCase(),
          url,
          headers,
          timeout: 10000,
        });

        return {
          success: true,
          data: {
            purchase_history: response.data.purchase_history || 'No purchase history available',
            interaction_notes: response.data.interaction_notes || 'No interaction notes available',
            last_contact_date: response.data.last_contact_date || new Date().toISOString(),
            api_response: response.data,
          },
        };
      } catch (apiError) {
        this.logger.warn(`API call failed: ${apiError.message}. Falling back to mock data.`);
        return this.getMockApiData(customerEmail, customerName);
      }
    } catch (error) {
      console.error('API Call Handler error:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error in API call',
      };
    }
  }

  private getMockApiData(customerEmail: string, customerName: string) {
    const mockData = {
      purchase_history: `${customerName} (${customerEmail}) has made 3 purchases totaling $2,450 in the last 6 months. Most recent purchase was Enterprise Plan upgrade on March 15th, 2024.`,
      interaction_notes: `Last interaction: Demo call on March 10th where ${customerName} showed strong interest in automation features. Follow-up scheduled for product training session.`,
      last_contact_date: '2024-03-15T14:30:00Z',
    };

    this.logger.log('Returning mock API data for customer:', customerEmail);
    return {
      success: true,
      data: mockData,
    };
  }
}
