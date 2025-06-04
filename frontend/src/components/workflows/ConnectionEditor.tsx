import React, {useState, useEffect} from 'react';
import {X, Save} from 'lucide-react';
import {Connection, WorkflowNode} from '../../types/workflow';
import {getNodeOutputVariables} from '../../utils/helpers';

interface ConnectionEditorProps {
    connection: Connection | null;
    sourceNode: WorkflowNode | null;
    targetNode: WorkflowNode | null;
    onUpdateConnection: (connectionId: string, updates: Partial<Connection>) => void;
    onClose: () => void;
}

export const ConnectionEditor: React.FC<ConnectionEditorProps> = ({
                                                                      connection,
                                                                      sourceNode,
                                                                      targetNode,
                                                                      onUpdateConnection,
                                                                      onClose
                                                                  }) => {
    const [conditionType, setConditionType] = useState<'always' | 'if_empty' | 'if_not_empty' | 'if_equals' | 'if_contains'>('always');
    const [conditionField, setConditionField] = useState('');
    const [conditionValue, setConditionValue] = useState('');

    const availableFields = sourceNode ? getNodeOutputVariables(sourceNode) : [];

    useEffect(() => {
        if (connection) {
            setConditionType(connection.conditionType || 'always');
            setConditionField(connection.conditionField || '');
            setConditionValue(connection.conditionValue || '');
        }
    }, [connection]);

    if (!connection || !sourceNode || !targetNode) {
        return null;
    }

    const generateLabel = (): string => {
        switch (conditionType) {
            case 'always':
                return '';
            case 'if_empty':
                return conditionField ? `If ${conditionField} is empty` : 'If field is empty';
            case 'if_not_empty':
                return conditionField ? `If ${conditionField} exists` : 'If field exists';
            case 'if_equals':
                return conditionField && conditionValue ? `If ${conditionField} = "${conditionValue}"` : 'If field equals value';
            case 'if_contains':
                return conditionField && conditionValue ? `If ${conditionField} contains "${conditionValue}"` : 'If field contains text';
            default:
                return '';
        }
    };

    const handleSave = () => {
        const label = generateLabel();

        const updates: Partial<Connection> = {
            conditionType,
            conditionField: conditionType !== 'always' ? conditionField : undefined,
            conditionValue: (conditionType === 'if_equals' || conditionType === 'if_contains') ? conditionValue : undefined,
            label: label || undefined
        };
        onUpdateConnection(connection.id, updates);
        onClose();
    };

    const currentLabel = generateLabel();

    return (
        <div className="bg-white shadow-xl border rounded-lg overflow-hidden max-h-[80vh] w-96">
            {/* Header */}
            <div className="p-4 border-b bg-blue-50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Connection Settings</h3>
                        <p className="text-sm text-gray-600">
                            {sourceNode.name} → {targetNode.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
                {/* Success indicator */}
                <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-green-800 font-medium">✅ Connection Editor is working!</p>
                    <p className="text-green-700 text-sm">Connection ID: {connection.id}</p>
                    <p className="text-green-700 text-sm">Current label: "{connection.label || 'none'}"</p>
                </div>

                {/* Condition Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        When should this connection execute?
                    </label>
                    <select
                        value={conditionType}
                        onChange={(e) => setConditionType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="always">Always Execute</option>
                        <option value="if_empty">If field is empty</option>
                        <option value="if_not_empty">If field has value</option>
                        <option value="if_equals">If field equals value</option>
                        <option value="if_contains">If field contains text</option>
                    </select>
                </div>

                {/* Field Selection */}
                {conditionType !== 'always' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Which field to check?
                        </label>
                        <select
                            value={conditionField}
                            onChange={(e) => setConditionField(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">Select field...</option>
                            {availableFields.map(field => (
                                <option key={field} value={field}>{field}</option>
                            ))}
                        </select>
                        {availableFields.length === 0 && (
                            <p className="text-sm text-orange-600 mt-1">
                                ⚠️ Configure the source node first to see available fields
                            </p>
                        )}
                    </div>
                )}

                {/* Value Input */}
                {(conditionType === 'if_equals' || conditionType === 'if_contains') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {conditionType === 'if_equals' ? 'Equals value:' : 'Contains text:'}
                        </label>
                        <input
                            type="text"
                            value={conditionValue}
                            onChange={(e) => setConditionValue(e.target.value)}
                            placeholder="Enter value..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                )}

                {/* Live Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-blue-800">
                        <strong>Preview Label:</strong>
                        <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">
              {currentLabel || 'Always execute (no label)'}
            </span>
                    </p>
                </div>

                {/* Google Calendar Example */}
                {sourceNode.type === 'trigger' && conditionType === 'if_empty' && conditionField === 'event_id' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-yellow-800">
                            ✅ Perfect for Google Calendar! This will execute when no events are found.
                        </p>
                    </div>
                )}

                {/* Debug info */}
                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs">
                    <strong>Debug Info:</strong>
                    <div>Condition Type: {conditionType}</div>
                    <div>Condition Field: {conditionField || 'none'}</div>
                    <div>Condition Value: {conditionValue || 'none'}</div>
                    <div>Available Fields: {availableFields.join(', ') || 'none'}</div>
                </div>
            </div>

            {/* Save Button */}
            <div className="bg-white border-t p-4">
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4"/>
                        Save Condition
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
