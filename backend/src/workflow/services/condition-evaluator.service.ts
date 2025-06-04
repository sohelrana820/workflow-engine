import {Injectable} from '@nestjs/common';

export interface NextStepCondition {
    id: string;
    type: string;
    condition: string;
    conditionType?: 'always' | 'if_not_empty' | 'if_empty' | 'equals' | 'not_equals' | 'contains';
    conditionField?: string;
    conditionValue?: any;
    label?: string;
    input_data?: string[];
}

export interface WorkflowExecutionContext {
    workflowId: string;
    workflowExecutionId: string;
    stepData: Map<string, any>;
    globalVariables: Map<string, any>;
}

@Injectable()
export class ConditionEvaluatorService {

    /**
     * Evaluates all next steps and returns the ones that should be executed
     */
    evaluateNextSteps(
        nextSteps: NextStepCondition[],
        currentStepStatus: string,
        context: WorkflowExecutionContext,
        currentStepData: any = {}
    ): NextStepCondition[] {
        const validNextSteps: NextStepCondition[] = [];

        for (const nextStep of nextSteps) {
            if (this.evaluateCondition(nextStep, currentStepStatus, context, currentStepData)) {
                validNextSteps.push(nextStep);
            }
        }

        return validNextSteps;
    }

    /**
     * Evaluates a single condition for a next step
     */
    private evaluateCondition(
        nextStep: NextStepCondition,
        currentStepStatus: string,
        context: WorkflowExecutionContext,
        currentStepData: any = {}
    ): boolean {
        // Handle basic status conditions first
        if (!this.evaluateBasicCondition(nextStep.condition, currentStepStatus)) {
            return false;
        }

        // If no conditionType specified, assume 'always' after basic condition passes
        if (!nextStep.conditionType || nextStep.conditionType === 'always') {
            return true;
        }

        // Get the field value to evaluate
        const fieldValue = this.getFieldValue(nextStep.conditionField, context, currentStepData);
        // Evaluate the specific condition type
        return this.evaluateFieldCondition(nextStep.conditionType, fieldValue, nextStep.conditionValue);
    }

    /**
     * Evaluates basic conditions like 'always', 'success', 'failure'
     */
    private evaluateBasicCondition(condition: string, currentStepStatus: string): boolean {
        switch (condition?.toLowerCase()) {
            case 'always':
                return true;
            case 'success':
                return currentStepStatus === 'COMPLETED';
            case 'failure':
                return currentStepStatus === 'FAILED';
            default:
                return true; // Default to true for unknown conditions
        }
    }

    /**
     * Gets field value from context or current step data
     */
    private getFieldValue(
        fieldName: string | undefined,
        context: WorkflowExecutionContext,
        currentStepData: any
    ): any {
        if (!fieldName) {
            return undefined;
        }

        // Priority 1: Check current step data
        if (currentStepData && currentStepData[fieldName] !== undefined) {
            return currentStepData[fieldName];
        }

        // Priority 2: Check all step data in context
        for (const [stepId, stepData] of context.stepData.entries()) {
            if (stepData && stepData[fieldName] !== undefined) {
                return stepData[fieldName];
            }
        }

        // Priority 3: Check global variables
        const globalValue = context.globalVariables.get(fieldName);
        if (globalValue !== undefined) {
            return globalValue;
        }

        return undefined;
    }

    /**
     * Evaluates field-specific conditions
     */
    private evaluateFieldCondition(conditionType: string, fieldValue: any, expectedValue?: any): boolean {
        switch (conditionType) {
            case 'if_not_empty':
                return this.isNotEmpty(fieldValue);

            case 'if_empty':
                return this.isEmpty(fieldValue);

            case 'equals':
                return this.isEqual(fieldValue, expectedValue);

            case 'not_equals':
                return !this.isEqual(fieldValue, expectedValue);

            case 'contains':
                return this.contains(fieldValue, expectedValue);

            case 'greater_than':
                return this.isGreaterThan(fieldValue, expectedValue);

            case 'less_than':
                return this.isLessThan(fieldValue, expectedValue);

            case 'always':
                return true;

            default:
                console.warn(`Unknown condition type: ${conditionType}, defaulting to true`);
                return true;
        }
    }

    /**
     * Helper methods for condition evaluation
     */
    private isNotEmpty(value: any): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return Boolean(value);
    }

    private isEmpty(value: any): boolean {
        return !this.isNotEmpty(value);
    }

    private isEqual(value: any, expected: any): boolean {
        if (typeof value === 'string' && typeof expected === 'string') {
            return value.toLowerCase() === expected.toLowerCase();
        }
        return value === expected;
    }

    private contains(value: any, searchValue: any): boolean {
        if (typeof value === 'string' && typeof searchValue === 'string') {
            return value.toLowerCase().includes(searchValue.toLowerCase());
        }
        if (Array.isArray(value)) {
            return value.includes(searchValue);
        }
        return false;
    }

    private isGreaterThan(value: any, expected: any): boolean {
        const numValue = Number(value);
        const numExpected = Number(expected);
        return !isNaN(numValue) && !isNaN(numExpected) && numValue > numExpected;
    }

    private isLessThan(value: any, expected: any): boolean {
        const numValue = Number(value);
        const numExpected = Number(expected);
        return !isNaN(numValue) && !isNaN(numExpected) && numValue < numExpected;
    }

    /**
     * Validates condition configuration
     */
    validateCondition(condition: NextStepCondition): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!condition.id) {
            errors.push('Next step must have an id');
        }

        if (!condition.condition) {
            errors.push('Next step must have a condition');
        }

        // Validate conditionType requirements
        const fieldRequiredTypes = ['if_not_empty', 'if_empty', 'equals', 'not_equals', 'contains', 'greater_than', 'less_than'];
        if (fieldRequiredTypes.includes(condition.conditionType || '') && !condition.conditionField) {
            errors.push(`ConditionType '${condition.conditionType}' requires conditionField`);
        }

        const valueRequiredTypes = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'];
        if (valueRequiredTypes.includes(condition.conditionType || '') && condition.conditionValue === undefined) {
            errors.push(`ConditionType '${condition.conditionType}' requires conditionValue`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
