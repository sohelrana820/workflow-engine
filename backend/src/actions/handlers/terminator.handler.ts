import {Injectable} from '@nestjs/common';
import {BaseActionHandler} from './base-action.handler';

@Injectable()
export class TerminatorHandler extends BaseActionHandler {
  async execute(config: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('------------------Workflow terminated successfully--------------')

      return {
        success: true,
        data: {
          message: 'Workflow terminated successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'Unknown error',
      };
    }
  }
}
