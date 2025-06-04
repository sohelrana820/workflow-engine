// src/actions/handlers/enhanced-base-action.handler.ts
import { Logger } from '@nestjs/common';

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  retryable?: boolean;
  metadata?: {
    executionTime?: number;
    memoryUsage?: number;
    attemptNumber?: number;
  };
}

export interface ActionExecutionContext {
  stepId: string;
  workflowId: string;
  attemptNumber?: number;
  timeout?: number;
}

export abstract class EnhancedBaseActionHandler {
  protected readonly logger = new Logger(this.constructor.name);

  abstract executeAction(config: any, context?: ActionExecutionContext): Promise<ActionResult>;

  async execute(config: any, context?: ActionExecutionContext): Promise<ActionResult> {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;

    try {
      this.logger.log(`🚀 Starting action execution: ${this.constructor.name}`);
      this.validateConfig(config);

      const result = await this.executeAction(config, context);

      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - initialMemory;

      this.logger.log(`✅ Action completed in ${executionTime}ms`);

      return {
        ...result,
        metadata: {
          executionTime,
          memoryUsage: memoryUsed,
          attemptNumber: context?.attemptNumber || 1,
          ...result.metadata,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const isRetryable = this.isRetryableError(error);

      this.logger.error(`❌ Action failed after ${executionTime}ms:`, error.message);

      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        retryable: isRetryable,
        metadata: {
          executionTime,
          attemptNumber: context?.attemptNumber || 1,
        },
      };
    }
  }

  protected validateConfig(config: any): void {
    // Override in subclasses for specific validation
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration provided');
    }
  }

  protected isRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';

    // Define retryable error patterns
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'service unavailable',
      '502', // Bad Gateway
      '503', // Service Unavailable
      '504', // Gateway Timeout
      'econnreset',
      'econnrefused',
      'etimedout',
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  protected createTimeoutPromise<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Action timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  protected sanitizeForLogging(data: any): any {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };

    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }

    return sanitized;
  }
}
