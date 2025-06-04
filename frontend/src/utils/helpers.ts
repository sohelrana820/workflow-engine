import {WorkflowNode, Connection, Workflow, Position, NodeType, NodeTypeConfig, ActionConfig} from '../types/workflow';
import {Calendar, Database, Brain, Bell, StopCircle, Download} from 'lucide-react';

export const NODE_TYPES: Record<NodeType, NodeTypeConfig> = {
    trigger: {
        label: 'Trigger',
        icon: Calendar,
        color: 'bg-blue-500',
        description: 'Start workflow execution',
        actions: {
            google_calendar: {
                name: 'Google Calendar',
                config: {
                    action_type: 'get_upcoming_events',
                    time_range: {hours_ahead: 24},
                    max_results: 10
                },
                output_data: {
                    event_id: 'string',
                    event_title: 'string',
                    event_summery: 'string',
                    event_description: 'string',
                    event_start_time: 'string',
                    event_end_time: 'string',
                    event_date: 'string',
                    event_organizer_name: 'string',
                    event_attendees_name: 'string',
                    event_attendees_email: 'string',
                },
                outputs: [
                    'event_id',
                    'event_title',
                    'event_summery',
                    'event_description',
                    'event_start_time',
                    'event_end_time',
                    'event_date',
                    'event_organizer_name',
                    'event_attendees_name',
                    'event_attendees_email'
                ]
            }
        }
    },
    enrichment: {
        label: 'Enrichment',
        icon: Database,
        color: 'bg-green-500',
        description: 'Enrich data with additional information',
        actions: {
            enrich: {
                name: 'Information Enrich',
                config: {
                    action: 'getCustomerHistory',
                    customerEmail: ''
                },
                output_data: {
                    first_name: 'string',
                    last_name: 'number',
                    name: 'string',
                    email: 'string',
                    company: 'string',
                    job_title: 'string'
                },
                outputs: [
                    'first_name',
                    'last_name',
                    'name',
                    'email',
                    'company',
                    'job_title'
                ]
            },
        }
    },
    fetch: {
        label: 'Fetch Data',
        icon: Download,
        color: 'bg-cyan-500',
        description: 'Fetch data from external sources',
        actions: {
            crm: {
                name: 'Fetch CRM Data',
                config: {},
                output_data: {
                    purchase_history: 'string',
                    interaction_notes: 'string',
                    last_contact_date: 'string'
                },
                outputs: ['purchase_history', 'interaction_notes', 'last_contact_date']
            },
            database_query: {
                name: 'Database Query',
                config: {
                    query: '',
                    connection_string: ''
                },
                output_data: {
                    query_results: 'array',
                    row_count: 'number',
                    execution_time: 'number'
                },
                outputs: ['query_results', 'row_count', 'execution_time']
            }
        }
    },
    ai: {
        label: 'AI Processing',
        icon: Brain,
        color: 'bg-purple-500',
        description: 'Process data using AI models',
        actions: {
            open_ai: {
                name: 'OpenAI Summary',
                config: {
                    model: 'gpt-4',
                    max_tokens: 500,
                    prompt: ''
                },
                output_data: {
                    ai_summary: 'string',
                },
                outputs: ['ai_summary']
            }
        }
    },
    notification: {
        label: 'Notification',
        icon: Bell,
        color: 'bg-orange-500',
        description: 'Send notifications and alerts',
        actions: {
            slack: {
                name: 'Slack Message',
                config: {
                    channel: '#general',
                    message: '',
                    webhook_url: ''
                },
                output_data: {
                    message: 'string',
                },
                outputs: ['message']
            },
            email: {
                name: 'Email',
                config: {
                    to: '',
                    subject: '',
                    body: '',
                    smtp_config: {}
                },
                output_data: {
                    email_body: 'string'
                },
                outputs: ['email_body']
            }
        }
    },
    terminator: {
        label: 'End',
        icon: StopCircle,
        color: 'bg-red-500',
        description: 'End workflow execution',
        actions: {
            terminator: {
                name: 'Workflow Complete',
                config: {
                    clear_temp_files: true,
                    log_completion: true,
                    update_workflow_status: 'completed'
                },
                output_data: {
                    completion_time: 'string',
                    total_execution_time: 'string',
                    final_status: 'string'
                },
                outputs: ['completion_time', 'total_execution_time', 'final_status']
            }
        }
    }
};

// Integration-aware helper functions
export const getIntegrationActions = (nodeType: NodeType): string[] => {
    const nodeConfig = NODE_TYPES[nodeType];
    return Object.keys(nodeConfig.actions || {}).filter(actionKey => {
        const action = nodeConfig.actions[actionKey];
        return action.config.hasOwnProperty('integration_id');
    });
};

// Enhanced ActionConfig interface to support available integrations
interface EnhancedActionConfig extends ActionConfig {
    availableIntegrations?: Array<{ id: string; name: string; type: string }>;
}

export const populateIntegrationOptions = (
    nodeType: NodeType,
    actionKey: string,
    availableIntegrations: Array<{ id: string; name: string; type: string }>
): EnhancedActionConfig => {
    const nodeConfig = NODE_TYPES[nodeType];
    const action = nodeConfig.actions[actionKey];

    if (!action || !action.config.hasOwnProperty('integration_id')) {
        return action;
    }

    // Filter integrations based on the action requirements
    let relevantIntegrations: Array<{ id: string; name: string; type: string }> = [];

    if (actionKey === 'google_calendar') {
        relevantIntegrations = availableIntegrations.filter(i => i.type === 'google_calendar');
    } else if (actionKey === 'openai_chat' || actionKey === 'text_analysis') {
        relevantIntegrations = availableIntegrations.filter(i => i.type === 'openai');
    } else if (actionKey === 'slack_notification') {
        relevantIntegrations = availableIntegrations.filter(i => i.type === 'slack');
    }

    return {
        ...action,
        availableIntegrations: relevantIntegrations
    } as EnhancedActionConfig;
};

// Enhanced validation for integration-dependent actions
export const validateIntegrationAction = (
    node: WorkflowNode,
    availableIntegrations: Array<{ id: string; name: string; type: string }>
): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    Object.entries(node.actions).forEach(([actionKey, action]) => {
        if (action.config.integration_id) {
            const integration = availableIntegrations.find(i => i.id === action.config.integration_id);
            if (!integration) {
                errors.push(`Integration not found for action: ${actionKey}`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Existing helper functions (keeping all the original ones)
export const generateNodeId = (type: NodeType): string => {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateConnectionId = (sourceId: string, targetId: string): string => {
    return `${sourceId}-${targetId}-${Date.now()}`;
};

export const createNewNode = (type: NodeType, position: Position): WorkflowNode => {
    const nodeConfig = NODE_TYPES[type];
    return {
        id: generateNodeId(type),
        type,
        name: `${nodeConfig.label} Node`,
        position,
        actions: {}, // Start with empty actions - user must select an action first
        next_steps: [],
        variables: {},
        error_handling: {
            on_failure: 'continue',
            retry_count: 2
        },
        status: 'idle'
    };
};

export const validateConnection = (
    sourceId: string,
    targetId: string,
    existingConnections: Connection[],
    nodes: WorkflowNode[]
): { isValid: boolean; error?: string } => {
    // Prevent self-connection
    if (sourceId === targetId) {
        return {isValid: false, error: 'Cannot connect node to itself'};
    }

    // Check if source node has configured actions
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode || !hasConfiguredActions(sourceNode)) {
        return {isValid: false, error: 'Source node must have a configured action before creating connections'};
    }

    // Prevent duplicate connections
    const duplicateExists = existingConnections.some(
        conn => conn.sourceId === sourceId && conn.targetId === targetId
    );

    if (duplicateExists) {
        return {isValid: false, error: 'Connection already exists'};
    }

    // Check for circular dependencies (basic check)
    const wouldCreateCycle = (source: string, target: string, connections: Connection[]): boolean => {
        const visited = new Set<string>();

        const dfs = (nodeId: string): boolean => {
            if (visited.has(nodeId)) return false;
            if (nodeId === source) return true;

            visited.add(nodeId);

            const outgoingConnections = connections.filter(conn => conn.sourceId === nodeId);
            return outgoingConnections.some(conn => dfs(conn.targetId));
        };

        return dfs(target);
    };

    if (wouldCreateCycle(sourceId, targetId, existingConnections)) {
        return {isValid: false, error: 'Would create circular dependency'};
    }

    return {isValid: true};
};

// Get all output variables from a node (only from configured actions)
export const getNodeOutputVariables = (node: WorkflowNode): string[] => {
    const outputs: string[] = [];

    Object.values(node.actions).forEach(action => {
        if (action.outputs) {
            outputs.push(...action.outputs);
        }
    });

    return outputs;
};

export const getAvailableInputVariables = (
    currentNodeId: string,
    nodes: WorkflowNode[],
    connections: Connection[]
): string[] => {
    const availableVariables: string[] = [];
    const visited = new Set<string>();

    // Recursive function to get all upstream outputs
    const getUpstreamOutputs = (nodeId: string): string[] => {
        if (visited.has(nodeId)) return []; // Prevent cycles
        visited.add(nodeId);

        const upstreamOutputs: string[] = [];

        // Find all nodes that connect to this node
        const incomingConnections = connections.filter(conn => conn.targetId === nodeId);

        incomingConnections.forEach(conn => {
            const sourceNode = nodes.find(n => n.id === conn.sourceId);
            if (sourceNode) {
                // Get outputs from this source node
                const sourceOutputs = getNodeOutputVariables(sourceNode);
                upstreamOutputs.push(...sourceOutputs);

                // Recursively get outputs from nodes upstream of this source node
                const upstreamFromSource = getUpstreamOutputs(sourceNode.id);
                upstreamOutputs.push(...upstreamFromSource);
            }
        });

        return upstreamOutputs;
    };

    const allUpstreamOutputs = getUpstreamOutputs(currentNodeId);
    availableVariables.push(...allUpstreamOutputs);

    // Remove duplicates and return
    return Array.from(new Set(availableVariables));
};

// Get formatted variables for user display (with {} wrapping)
export const getFormattedInputVariables = (
    currentNodeId: string,
    nodes: WorkflowNode[],
    connections: Connection[]
): string[] => {
    const rawVariables = getAvailableInputVariables(currentNodeId, nodes, connections);
    return rawVariables.map(variable => `{${variable}}`);
};

// Enhanced function to automatically pass ALL upstream output data to connected nodes
export const createConnectionWithOutputData = (
    sourceId: string,
    targetId: string,
    nodes: WorkflowNode[],
    connections: Connection[]
): { input_data: string[]; condition: string } => {
    // Get all available inputs for the target node (includes all upstream data)
    const allAvailableInputs = getAvailableInputVariables(targetId, nodes, connections);

    // Get outputs from the direct source node
    const sourceNode = nodes.find(n => n.id === sourceId);
    const directSourceOutputs = sourceNode ? getNodeOutputVariables(sourceNode) : [];

    // Combine all upstream data with direct source outputs
    const allInputData = [...allAvailableInputs, ...directSourceOutputs];

    // Remove duplicates
    const uniqueInputData = Array.from(new Set(allInputData));

    return {
        input_data: uniqueInputData,
        condition: 'always'
    };
};

// Function to generate connection labels from condition data
export const generateConnectionLabel = (connection: Partial<Connection>): string => {
    const {conditionType, conditionField, conditionValue} = connection;

    switch (conditionType) {
        case 'always':
            return ''; // No label for "always"
        case 'if_empty':
            return conditionField ? `If ${conditionField} is empty` : '';
        case 'if_not_empty':
            return conditionField ? `If ${conditionField} exists` : '';
        case 'if_equals':
            return conditionField && conditionValue ? `If ${conditionField} = "${conditionValue}"` : '';
        case 'if_contains':
            return conditionField && conditionValue ? `If ${conditionField} contains "${conditionValue}"` : '';
        default:
            return '';
    }
};

// Convert nodes to workflow definition with proper condition handling
export const convertNodesToWorkflowDefinition = (
    nodes: WorkflowNode[],
    connections: Connection[],
    workflowName: string
): Workflow => {
    // Helper function to get all upstream data for a node recursively
    const getAllUpstreamData = (nodeId: string, visited: Set<string> = new Set()): string[] => {
        if (visited.has(nodeId)) return []; // Prevent cycles
        visited.add(nodeId);

        const allUpstreamData: string[] = [];

        // Find all connections coming into this node
        const incomingConnections = connections.filter(conn => conn.targetId === nodeId);

        incomingConnections.forEach(conn => {
            const sourceNode = nodes.find(n => n.id === conn.sourceId);
            if (sourceNode) {
                // Get outputs from the source node
                const sourceOutputs = getNodeOutputVariables(sourceNode);
                allUpstreamData.push(...sourceOutputs);

                // Recursively get all upstream data from the source node
                const upstreamFromSource = getAllUpstreamData(sourceNode.id, new Set(visited));
                allUpstreamData.push(...upstreamFromSource);
            }
        });

        // Remove duplicates and return
        return Array.from(new Set(allUpstreamData));
    };

    // Update next_steps based on connections with cascading data flow AND CONDITIONS
    const updatedNodes = nodes.map(node => {
        const nodeInputData = getAllUpstreamData(node.id);

        // Variables array should ONLY contain upstream data (input_data), not the node's own outputs
        const formattedVariables = nodeInputData.map(variable => `{${variable}}`);

        return {
            ...node,
            // Add input_data to each node showing what data it receives
            input_data: nodeInputData,
            // Add variables array with formatted {variable} names ONLY for upstream data
            variables: formattedVariables,
            next_steps: connections
                .filter(conn => conn.sourceId === node.id)
                .map(conn => {
                    const targetNode = nodes.find(n => n.id === conn.targetId);

                    // Get ALL upstream data that will be available to the target node
                    const targetUpstreamData = getAllUpstreamData(conn.targetId);
                    const currentNodeOutputs = getNodeOutputVariables(node);

                    // Combine all upstream data with current node outputs
                    const allAvailableData = [...targetUpstreamData, ...currentNodeOutputs];
                    const uniqueInputData = Array.from(new Set(allAvailableData));

                    // Include ALL condition data in next_steps
                    return {
                        id: conn.targetId,
                        type: targetNode?.type || 'unknown',
                        condition: conn.condition || 'always', // Keep for backward compatibility
                        input_data: uniqueInputData,
                        // Include conditional execution fields
                        conditionType: conn.conditionType || 'always',
                        conditionField: conn.conditionField,
                        conditionValue: conn.conditionValue,
                        label: conn.label
                    };
                })
        };
    });

    return {
        id: `workflow-${Date.now()}`,
        name: workflowName || 'Untitled Workflow',
        description: `Workflow with ${nodes.length} nodes`,
        version: '1.0',
        nodes: updatedNodes,
        status: 'ACTIVE',
        metadata: {
            timeout: 3600,
            retry_policy: {
                max_retries: 3,
                backoff_strategy: 'exponential'
            }
        }
    };
};

export const downloadWorkflowAsJSON = (workflow: Workflow): void => {
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
};

export const calculateNodeBounds = (nodes: WorkflowNode[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
} => {
    if (nodes.length === 0) {
        return {minX: 0, minY: 0, maxX: 1200, maxY: 800};
    }

    const positions = nodes.map(node => node.position);
    const minX = Math.min(...positions.map(p => p.x)) - 100;
    const minY = Math.min(...positions.map(p => p.y)) - 100;
    const maxX = Math.max(...positions.map(p => p.x)) + 300;
    const maxY = Math.max(...positions.map(p => p.y)) + 200;

    return {minX, minY, maxX, maxY};
};

export const fitNodesToView = (
    nodes: WorkflowNode[],
    containerWidth: number,
    containerHeight: number
): { scale: number; offset: Position } => {
    if (nodes.length === 0) {
        return {scale: 1, offset: {x: 0, y: 0}};
    }

    const bounds = calculateNodeBounds(nodes);
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to add some padding

    const offsetX = (containerWidth - contentWidth * scale) / 2 - bounds.minX * scale;
    const offsetY = (containerHeight - contentHeight * scale) / 2 - bounds.minY * scale;

    return {
        scale: Math.max(0.1, Math.min(2, scale)),
        offset: {x: offsetX, y: offsetY}
    };
};

export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): T => {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(null, args), wait);
    }) as T;
};

export const formatExecutionTime = (milliseconds: number): string => {
    if (milliseconds < 1000) {
        return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
        return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
};

// Get available actions for a node type (that user can select from)
export const getAvailableActionsForNodeType = (nodeType: NodeType): Record<string, ActionConfig> => {
    const nodeConfig = NODE_TYPES[nodeType];
    return nodeConfig?.actions || {};
};

// Check if a node has any configured actions
export const hasConfiguredActions = (node: WorkflowNode): boolean => {
    return Object.keys(node.actions).length > 0;
};

// Get the currently selected/configured action for a node
export const getConfiguredActionKey = (node: WorkflowNode): string | null => {
    const actionKeys = Object.keys(node.actions);
    return actionKeys.length > 0 ? actionKeys[0] : null;
};

// Enhanced function to get output data with type information
export const getNodeOutputDataTypes = (node: WorkflowNode): Record<string, string> => {
    const outputTypes: Record<string, string> = {};

    Object.values(node.actions).forEach((action: ActionConfig) => {
        if (action.output_data) {
            Object.entries(action.output_data).forEach(([key, type]) => {
                outputTypes[key] = type as string;
            });
        }
    });

    return outputTypes;
};

// Enhanced function to validate input data types
export const validateInputDataTypes = (
    targetNode: WorkflowNode,
    sourceNode: WorkflowNode,
    inputData: string[]
): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const sourceOutputTypes = getNodeOutputDataTypes(sourceNode);

    inputData.forEach(input => {
        if (!sourceOutputTypes[input]) {
            errors.push(`Output '${input}' not available from source node`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Function to automatically determine the best input mapping with cascading data
export const getOptimalInputMapping = (
    sourceNode: WorkflowNode,
    targetNode: WorkflowNode,
    nodes: WorkflowNode[],
    connections: Connection[]
): string[] => {
    // Get ALL available upstream data for the target node
    const allUpstreamData = getAvailableInputVariables(targetNode.id, nodes, connections);

    // Get direct outputs from the source node
    const directSourceOutputs = getNodeOutputVariables(sourceNode);

    // Combine all available data
    const allAvailableData = [...allUpstreamData, ...directSourceOutputs];
    const uniqueData = Array.from(new Set(allAvailableData));

    const targetNodeType = NODE_TYPES[targetNode.type];

    // Get the first action configuration of target node to understand expected inputs
    const firstAction = Object.values(targetNodeType.actions)[0];
    if (!firstAction || !firstAction.config) {
        return uniqueData; // Pass all available data if no specific requirements
    }

    // Try to match output names with config field names
    const configFields = Object.keys(firstAction.config);
    const matchedInputs: string[] = [];

    configFields.forEach(field => {
        const matchingOutput = uniqueData.find(output =>
            output.toLowerCase().includes(field.toLowerCase()) ||
            field.toLowerCase().includes(output.toLowerCase())
        );

        if (matchingOutput) {
            matchedInputs.push(matchingOutput);
        }
    });

    // If no specific matches, return all available data
    return matchedInputs.length > 0 ? matchedInputs : uniqueData;
};

// Function to evaluate conditions during workflow execution
export const evaluateCondition = (
    connection: Connection,
    nodeOutputData: Record<string, any>
): boolean => {
    if (!connection.conditionType || connection.conditionType === 'always') {
        return true;
    }

    const fieldValue = nodeOutputData[connection.conditionField || ''];

    switch (connection.conditionType) {
        case 'if_empty':
            return !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined;
        case 'if_not_empty':
            return fieldValue && fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
        case 'if_equals':
            return fieldValue === connection.conditionValue;
        case 'if_contains':
            return fieldValue && fieldValue.toString().toLowerCase().includes((connection.conditionValue || '').toLowerCase());
        default:
            return true;
    }
};

// Load workflow from backend and regenerate labels
export const loadWorkflowToNodes = (workflow: Workflow): { nodes: WorkflowNode[], connections: Connection[] } => {
    // Ensure workflow.nodes is an array
    let workflowNodes: WorkflowNode[];

    if (Array.isArray(workflow.nodes)) {
        workflowNodes = workflow.nodes;
    } else if (typeof workflow.nodes === 'string') {
        try {
            workflowNodes = JSON.parse(workflow.nodes);
        } catch (error) {
            console.error('Failed to parse workflow nodes:', error);
            workflowNodes = [];
        }
    } else {
        // Handle any other case
        workflowNodes = [];
    }

    const nodes = workflowNodes.map((node: WorkflowNode) => ({
        ...node,
        status: 'idle' as const
    })) as WorkflowNode[];

    const connections: Connection[] = [];
    workflowNodes.forEach((node: WorkflowNode) => {
        if (node.next_steps) {
            node.next_steps.forEach((step) => {
                // Reconstruct connection with all condition data
                const connection: Connection = {
                    id: generateConnectionId(node.id, step.id),
                    sourceId: node.id,
                    targetId: step.id,
                    condition: step.condition || 'always',
                    input_data: step.input_data || [],
                    // Extract condition data from next_steps
                    conditionType: step.conditionType || 'always',
                    conditionField: step.conditionField,
                    conditionValue: step.conditionValue,
                    label: step.label
                };

                // If no label exists but we have condition data, regenerate it
                if (!connection.label && connection.conditionType !== 'always') {
                    connection.label = generateConnectionLabel(connection);
                }

                connections.push(connection);
            });
        }
    });

    return {nodes, connections};
};
