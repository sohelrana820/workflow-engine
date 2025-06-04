import React from 'react';
import {NODE_TYPES} from '../../utils/helpers';
import {NodeType} from '../../types/workflow';

interface NodeActionsProps {
    onAddNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
    executionResult?: any;
}

export const NodeActions: React.FC<NodeActionsProps> = ({
                                                            onAddNode,
                                                            executionResult
                                                        }) => {
    const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('text/plain', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="h-full bg-gray-50 border-r overflow-y-auto">
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Node Library</h3>

                {/* Node Categories */}
                <div className="space-y-6">
                    {/* Triggers */}
                    <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                            Triggers
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(NODE_TYPES)
                                .filter(([type]) => type === 'trigger')
                                .map(([type, config]) => {
                                    const IconComponent = config.icon;
                                    return (
                                        <div
                                            key={type}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, type as NodeType)}
                                            className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-grab hover:shadow-md transition-all hover:border-blue-300 group"
                                        >
                                            <div
                                                className={`p-2 rounded ${config.color} group-hover:scale-110 transition-transform`}>
                                                <IconComponent className="w-4 h-4 text-white"/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">{config.label}</div>
                                                <div className="text-xs text-gray-500">{config.description}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Data Processing */}
                    <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                            Data Processing
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(NODE_TYPES)
                                .filter(([type]) => ['enrichment', 'fetch', 'ai'].includes(type))
                                .map(([type, config]) => {
                                    const IconComponent = config.icon;
                                    return (
                                        <div
                                            key={type}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, type as NodeType)}
                                            className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-grab hover:shadow-md transition-all hover:border-blue-300 group"
                                        >
                                            <div
                                                className={`p-2 rounded ${config.color} group-hover:scale-110 transition-transform`}>
                                                <IconComponent className="w-4 h-4 text-white"/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">{config.label}</div>
                                                <div className="text-xs text-gray-500">{config.description}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Output */}
                    <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                            Output & Control
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(NODE_TYPES)
                                .filter(([type]) => ['notification', 'terminator'].includes(type))
                                .map(([type, config]) => {
                                    const IconComponent = config.icon;
                                    return (
                                        <div
                                            key={type}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, type as NodeType)}
                                            className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-grab hover:shadow-md transition-all hover:border-blue-300 group"
                                        >
                                            <div
                                                className={`p-2 rounded ${config.color} group-hover:scale-110 transition-transform`}>
                                                <IconComponent className="w-4 h-4 text-white"/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">{config.label}</div>
                                                <div className="text-xs text-gray-500">{config.description}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                {/* Execution Results */}
                {executionResult && (
                    <div className="mt-6 pt-6 border-t">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Execution Result</h4>
                        <div className="bg-white rounded-lg border p-3">
                            <div className={`text-sm font-medium mb-2 ${
                                executionResult.status === 'completed' ? 'text-green-700' :
                                    executionResult.status === 'failed' ? 'text-red-700' :
                                        executionResult.status === 'running' ? 'text-blue-700' :
                                            'text-gray-700'
                            }`}>
                                Status: {executionResult.status}
                            </div>

                            {executionResult.execution_time && (
                                <div className="text-xs text-gray-600 mb-2">
                                    Duration: {executionResult.execution_time}
                                </div>
                            )}

                            {executionResult.steps_executed && (
                                <div className="text-xs text-gray-600 mb-2">
                                    Steps: {executionResult.steps_executed}
                                </div>
                            )}

                            {executionResult.message && (
                                <div className="text-xs text-gray-800 mb-2">
                                    {executionResult.message}
                                </div>
                            )}

                            {executionResult.results?.nodes_processed && (
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-gray-700 mb-1">Node Results:</div>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {executionResult.results.nodes_processed.map((node: any, index: number) => (
                                            <div
                                                key={index}
                                                className={`text-xs p-2 rounded ${
                                                    node.status === 'completed' ? 'bg-green-50 text-green-800' :
                                                        node.status === 'failed' ? 'bg-red-50 text-red-800' :
                                                            'bg-gray-50 text-gray-800'
                                                }`}
                                            >
                                                <div className="font-medium">{node.id}</div>
                                                <div className="text-xs opacity-75">{node.status}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}


            </div>
        </div>
    );
};
