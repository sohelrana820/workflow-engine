export abstract class BaseActionHandler {
  abstract execute(config: any): Promise<{ success: boolean; data?: any; error?: string }>;
}
