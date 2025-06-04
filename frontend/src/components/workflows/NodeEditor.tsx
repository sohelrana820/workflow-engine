import React, {useState, useEffect} from 'react';
import {X, Save, Settings, AlertCircle, Copy, ExternalLink} from 'lucide-react';
import {WorkflowNode, ActionConfig} from '../../types/workflow';
import {
    NODE_TYPES,
    getFormattedInputVariables,
    getAvailableActionsForNodeType,
    hasConfiguredActions,
    populateIntegrationOptions
} from '../../utils/helpers';
import {integrationApiClient} from '../../services/integrationApi';

interface NodeEditorProps {
    node: WorkflowNode | null;
    allNodes: WorkflowNode[];
    connections: any[];
    onUpdateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
    onClose: () => void;
}

interface Integration {
    id: string;
    name: string;
    type: string;
    status: string;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({
                                                          node,
                                                          allNodes,
                                                          connections,
                                                          onUpdateNode,
                                                          onClose
                                                      }) => {
    const [nodeName, setNodeName] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [actionConfig, setActionConfig] = useState<Record<string, any>>({});
    const [errorHandling, setErrorHandling] = useState<{
        on_failure: string;
        retry_count: number;
    }>({
        on_failure: 'continue',
        retry_count: 2
    });

    const [availableIntegrations, setAvailableIntegrations] = useState<Integration[]>([]);
    const [loadingIntegrations, setLoadingIntegrations] = useState(false);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalState, setOriginalState] = useState<{
        name: string;
        selectedAction: string;
        actionConfig: Record<string, any>;
        errorHandling: any;
    } | null>(null);

    useEffect(() => {
        const loadIntegrations = async () => {
            setLoadingIntegrations(true);
            try {
                const response = await integrationApiClient.getAllIntegrations();
                if (response.success && Array.isArray(response.data)) {
                    setAvailableIntegrations(response.data);
                } else {
                    setAvailableIntegrations([]);
                }
            } catch (error) {
                setAvailableIntegrations([]);
            } finally {
                setLoadingIntegrations(false);
            }
        };

        loadIntegrations();
    }, []);

    useEffect(() => {
        if (node) {
            const firstActionKey = Object.keys(node.actions)[0];
            const initialActionConfig = firstActionKey && node.actions[firstActionKey]
                ? node.actions[firstActionKey].config || {}
                : {};

            const initialState = {
                name: node.name,
                selectedAction: firstActionKey || '',
                actionConfig: initialActionConfig,
                errorHandling: {
                    on_failure: node.error_handling?.on_failure || 'continue',
                    retry_count: node.error_handling?.retry_count ?? 2
                }
            };

            setNodeName(initialState.name);
            setSelectedAction(initialState.selectedAction);
            setActionConfig(initialState.actionConfig);
            setErrorHandling(initialState.errorHandling);
            setOriginalState(initialState);
            setHasUnsavedChanges(false);
        }
    }, [node]);

    // Check for changes whenever state updates
    useEffect(() => {
        if (!originalState) return;

        const currentState = {
            name: nodeName,
            selectedAction,
            actionConfig,
            errorHandling
        };

        const hasChanges = JSON.stringify(currentState) !== JSON.stringify(originalState);
        setHasUnsavedChanges(hasChanges);
    }, [nodeName, selectedAction, actionConfig, errorHandling, originalState]);

    if (!node) {
        return null;
    }

    const nodeType = NODE_TYPES[node.type];
    const formattedInputVariables = getFormattedInputVariables(node.id, allNodes, connections);
    const availableActions = getAvailableActionsForNodeType(node.type);
    const nodeHasConfiguredActions = hasConfiguredActions(node);

    const handleSave = () => {
        const updates: Partial<WorkflowNode> = {
            name: nodeName,
            error_handling: errorHandling
        };

        // Only save action if one is selected and configured
        if (selectedAction && availableActions[selectedAction]) {
            updates.actions = {
                [selectedAction]: {
                    ...availableActions[selectedAction],
                    config: actionConfig
                }
            };
        } else {
            // Clear actions if no action is selected
            updates.actions = {};
        }

        onUpdateNode(node.id, updates);

        // Update original state to reflect saved changes
        setOriginalState({
            name: nodeName,
            selectedAction,
            actionConfig,
            errorHandling
        });
        setHasUnsavedChanges(false);
    };

    const handleClose = () => {
        if (hasUnsavedChanges) {
            const confirmClose = window.confirm(
                'You have unsaved changes. Are you sure you want to close without saving?'
            );
            if (!confirmClose) return;
        }
        onClose();
    };

    const handleActionChange = (newActionKey: string) => {
        setSelectedAction(newActionKey);
        // Load the default config for the new action, but don't save it yet
        if (newActionKey && availableActions[newActionKey]) {
            setActionConfig(availableActions[newActionKey].config || {});
        } else {
            setActionConfig({});
        }
    };

    const handleConfigChange = (key: string, value: any) => {
        setActionConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const getIntegrationSelectOptions = (actionKey: string) => {
        if (!actionKey || !availableActions[actionKey]) return [];

        const action = availableActions[actionKey];
        if (!action.config.hasOwnProperty('integration_id')) return [];

        // Ensure availableIntegrations is an array before filtering
        if (!Array.isArray(availableIntegrations)) {
            console.warn('availableIntegrations is not an array:', availableIntegrations);
            return [];
        }

        // Filter integrations based on action type
        let filteredIntegrations: Integration[] = [];

        if (actionKey === 'google_calendar') {
            filteredIntegrations = availableIntegrations.filter(i => i.type === 'google_calendar');
        } else if (actionKey === 'openai_chat' || actionKey === 'text_analysis') {
            filteredIntegrations = availableIntegrations.filter(i => i.type === 'openai');
        } else if (actionKey === 'slack_notification') {
            filteredIntegrations = availableIntegrations.filter(i => i.type === 'slack');
        }

        return filteredIntegrations;
    };

    const renderConfigField = (key: string, value: any, type: string = 'text') => {
        // Special handling for integration_id field
        if (key === 'integration_id') {
            const integrationOptions = getIntegrationSelectOptions(selectedAction);

            return (
                <div key={key} className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">
                        Select Integration *
                    </label>
                    {integrationOptions.length > 0 ? (
                        <select
                            value={value || ''}
                            onChange={(e) => handleConfigChange(key, e.target.value)}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Select an integration...</option>
                            {integrationOptions.map(integration => (
                                <option key={integration.id} value={integration.id}>
                                    {integration.name} ({integration.status})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="text-xs text-orange-600 p-2 bg-orange-50 border border-orange-200 rounded">
                            <div className="flex items-center gap-1 mb-1">
                                <AlertCircle className="w-3 h-3"/>
                                <span className="font-medium">No integrations available</span>
                            </div>
                            <p>You need to set up the required integration first.</p>
                            <a
                                href="/integrations"
                                target="_blank"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-1"
                            >
                                Go to Integrations
                                <ExternalLink className="w-3 h-3"/>
                            </a>
                        </div>
                    )}
                </div>
            );
        }

        // Handle other field types
        switch (type) {
            case 'boolean':
                return (
                    <div key={key} className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <input
                            type="checkbox"
                            checked={value || false}
                            onChange={(e) => handleConfigChange(key, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                );

            case 'number':
                return (
                    <div key={key} className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <input
                            type="number"
                            value={value || ''}
                            onChange={(e) => handleConfigChange(key, parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                );

            case 'select':
                return (
                    <div key={key} className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <select
                            value={value || ''}
                            onChange={(e) => handleConfigChange(key, e.target.value)}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select...</option>
                            {formattedInputVariables.map(variable => (
                                <option key={variable} value={variable}>{variable}</option>
                            ))}
                        </select>
                    </div>
                );

            case 'textarea':
                return (
                    <div key={key} className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <textarea
                            value={value || ''}
                            onChange={(e) => handleConfigChange(key, e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                        />
                        {key.includes('template') && (
                            <p className="text-xs text-blue-600 mt-1">
                                💡 You can use variables like {formattedInputVariables.slice(0, 3).join(', ')} in your
                                template
                            </p>
                        )}
                    </div>
                );

            default:
                return (
                    <div key={key} className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => handleConfigChange(key, e.target.value)}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                        />
                    </div>
                );
        }
    };

    const getFieldType = (key: string, value: any): string => {
        if (key === 'integration_id') return 'integration_select';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        if (key.includes('message') || key.includes('body') || key.includes('prompt') || key.includes('template')) return 'textarea';
        if (key.includes('input_data') || key.includes('variable')) return 'select';
        return 'text';
    };

    return (
        <>
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded ${nodeType?.color || 'bg-gray-500'}`}>
                            {nodeType?.icon && <nodeType.icon className="w-4 h-4 text-white"/>}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Configure Node</h3>
                            <p className="text-sm text-gray-500">{nodeType?.label}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 p-1"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                {/* Node Status Indicator */}
                {!nodeHasConfiguredActions && (
                    <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600"/>
                            <span className="text-sm text-yellow-700 font-medium">No action configured</span>
                        </div>
                        <p className="text-xs text-yellow-600 mt-1">Select an action below to configure this node.</p>
                    </div>
                )}

                {/* Unsaved changes indicator */}
                {hasUnsavedChanges && (
                    <div className="mt-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm text-orange-700 font-medium">Unsaved changes</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
                {/* Basic Settings */}
                <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-500 pt-2">Basic Settings</h4>

                    <div className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">Node Name</label>
                        <input
                            type="text"
                            value={nodeName}
                            onChange={(e) => setNodeName(e.target.value)}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter node name"
                        />
                    </div>

                    {/* Action Selection */}
                    <div className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">Select Action</label>
                        <select
                            value={selectedAction}
                            onChange={(e) => handleActionChange(e.target.value)}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- Select an action --</option>
                            {Object.entries(availableActions).map(([key, action]) => (
                                <option key={key} value={key}>
                                    {action.name}
                                </option>
                            ))}
                        </select>
                        {Object.keys(availableActions).length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">No actions available for this node type.</p>
                        )}
                    </div>
                </div>

                {/* Action Configuration - Only show if action is selected */}
                {selectedAction && availableActions[selectedAction] && (
                    <div className="space-y-4">
                        <h4 className="text-md font-semibold text-gray-500 pt-2">Action Configuration</h4>

                        {/* Action Preview */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <div className="text-sm font-medium text-blue-900">
                                {availableActions[selectedAction].name}
                            </div>
                            <div className="text-xs text-blue-700 mt-1">
                                {availableActions[selectedAction].config ?
                                    `${Object.keys(availableActions[selectedAction].config).length} configuration options` :
                                    'No configuration required'
                                }
                            </div>
                            {/* Show expected outputs */}
                            {availableActions[selectedAction].outputs && (
                                <div className="text-xs text-blue-600 mt-2">
                                    <span className="font-medium">Outputs: </span>
                                    {availableActions[selectedAction].outputs?.join(', ')}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {Object.entries(actionConfig).map(([key, value]) =>
                                renderConfigField(key, value, getFieldType(key, value))
                            )}
                        </div>

                        {Object.keys(actionConfig).length === 0 && (
                            <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                                No configuration options available for this action.
                            </div>
                        )}
                    </div>
                )}

                {/* Show message when no action is selected */}
                {!selectedAction && (
                    <div className="space-y-4">
                        <h4 className="text-md font-semibold text-gray-500 pt-2">Action Configuration</h4>
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2"/>
                            <p className="text-sm text-gray-600 font-medium">No Action Selected</p>
                            <p className="text-xs text-gray-500 mt-1">Please select an action above to configure this
                                node.</p>
                        </div>
                    </div>
                )}

                {/* Available Variables - Only show if action is configured */}
                {selectedAction && formattedInputVariables.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-md font-semibold text-gray-500 pt-2">
                            Available Variables (All Upstream Data)
                        </h4>
                        <div className="text-xs text-gray-600 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <strong>💡 Usage Tip:</strong> Copy these variables and use them in your configuration fields
                            (prompts,
                            messages, etc.)
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                            {formattedInputVariables.map(variable => (
                                <div
                                    key={variable}
                                    className="group relative inline-flex items-center justify-between px-3 py-2 bg-green-50 rounded text-sm text-green-800 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                                    onClick={() => {
                                        navigator.clipboard.writeText(variable);
                                    }}
                                    title={`Click to copy: ${variable}`}
                                >
                                    <span className="font-mono text-xs">{variable}</span>
                                    <Copy
                                        className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-green-600"/>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Integration Status */}
                {selectedAction && availableActions[selectedAction]?.config?.hasOwnProperty('integration_id') && (
                    <div className="space-y-4">
                        <h4 className="text-md font-semibold text-gray-500 pt-2">Integration Status</h4>
                        {loadingIntegrations ? (
                            <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
                                Loading integrations...
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="font-medium mb-1">Available Integrations:</div>
                                {Array.isArray(availableIntegrations) && getIntegrationSelectOptions(selectedAction).length > 0 ? (
                                    <ul className="space-y-1">
                                        {getIntegrationSelectOptions(selectedAction).map(integration => (
                                            <li key={integration.id} className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    integration.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                                                }`}></div>
                                                <span>{integration.name} ({integration.status})</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-orange-600">
                                        No integrations available for this action.
                                        <a href="/integrations" target="_blank" className="underline ml-1">
                                            Set up integrations
                                        </a>
                                    </div>
                                )}

                                {/* Debug information */}
                                {process.env.NODE_ENV === 'development' && (
                                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                        <div>Debug Info:</div>
                                        <div>Available Integrations
                                            Type: {Array.isArray(availableIntegrations) ? 'Array' : typeof availableIntegrations}</div>
                                        <div>Available Integrations
                                            Length: {Array.isArray(availableIntegrations) ? availableIntegrations.length : 'N/A'}</div>
                                        <div>Selected Action: {selectedAction}</div>
                                        <div>Loading: {loadingIntegrations.toString()}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Error Handling */}
                <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-500 pt-2">Error Handling</h4>

                    <div className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">On Failure</label>
                        <select
                            value={errorHandling.on_failure}
                            onChange={(e) => setErrorHandling(prev => ({...prev, on_failure: e.target.value}))}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="continue">Continue</option>
                            <option value="terminate">Terminate</option>
                            <option value="retry">Retry</option>
                        </select>
                    </div>

                    <div className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">Retry Count</label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={errorHandling.retry_count}
                            onChange={(e) => setErrorHandling(prev => ({
                                ...prev,
                                retry_count: parseInt(e.target.value) || 0
                            }))}
                            className="w-full px-3 py-2 border text-xs border-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-white border-t p-4">
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges}
                        className={`flex-1 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-colors ${
                            hasUnsavedChanges
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <Save className="w-4 h-4"/>
                        {hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
                    </button>
                    <button
                        onClick={handleClose}
                        className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                    >
                        {hasUnsavedChanges ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </>
    );
};
