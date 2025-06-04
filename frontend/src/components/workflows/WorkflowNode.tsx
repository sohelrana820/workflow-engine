import React, {useState, useRef, useCallback, useEffect} from 'react';
import {Trash2, Settings, AlertTriangle} from 'lucide-react';
import {WorkflowNode as WorkflowNodeType, Position} from '../../types/workflow';
import {NODE_TYPES, hasConfiguredActions, getConfiguredActionKey} from '../../utils/helpers';

interface WorkflowNodeProps {
    node: WorkflowNodeType;
    isSelected: boolean;
    scale: number;
    onNodeClick: (node: WorkflowNodeType) => void;
    onNodeDrag: (nodeId: string, position: Position) => void;
    onConnectionStart: (nodeId: string, event: React.MouseEvent) => void;
    onConnectionEnd: (nodeId: string, event: React.MouseEvent) => void;
    onDeleteNode: (nodeId: string) => void;
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
                                                              node,
                                                              isSelected,
                                                              scale,
                                                              onNodeClick,
                                                              onNodeDrag,
                                                              onConnectionStart,
                                                              onConnectionEnd,
                                                              onDeleteNode
                                                          }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({x: 0, y: 0});
    const nodeRef = useRef<HTMLDivElement>(null);

    const nodeConfig = NODE_TYPES[node.type];
    const IconComponent = nodeConfig?.icon || Settings;
    const nodeHasActions = hasConfiguredActions(node);
    const configuredActionKey = getConfiguredActionKey(node);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.target instanceof Element && e.target.closest('.connection-handle')) return;

        setIsDragging(true);
        setDragStart({
            x: e.clientX - node.position.x * scale,
            y: e.clientY - node.position.y * scale
        });
        e.preventDefault();
    }, [node.position, scale]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const newPosition = {
            x: (e.clientX - dragStart.x) / scale,
            y: (e.clientY - dragStart.y) / scale
        };

        onNodeDrag(node.id, newPosition);
    }, [isDragging, dragStart, node.id, onNodeDrag, scale]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleConnectionHandleMouseDown = (e: React.MouseEvent, isOutput: boolean) => {
        e.stopPropagation();
        if (isOutput) {
            onConnectionStart(node.id, e);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteNode(node.id);
    };

    const getStatusColor = () => {
        switch (node.status) {
            case 'running':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'completed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'failed':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getNodeBorderColor = () => {
        if (!nodeHasActions) {
            return 'border-yellow-300 bg-yellow-50';
        }

        if (isSelected) {
            return 'border-blue-500 ring-2 ring-blue-200';
        }

        return 'border-gray-200 hover:border-gray-300';
    };

    return (
        <div
            ref={nodeRef}
            style={{
                position: 'absolute',
                left: node.position.x,
                top: node.position.y,
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
            }}
            className={`select-none cursor-move ${isDragging ? 'z-50' : 'z-10'}`}
            onMouseDown={handleMouseDown}
            onClick={() => onNodeClick(node)}
        >
            <div
                className={`px-4 py-3 shadow-lg rounded-lg border-2 min-w-[180px] bg-white transition-all duration-200 ${
                    getNodeBorderColor()
                } ${isDragging ? 'shadow-2xl scale-105' : ''}`}>

                {/* Input Handle */}
                <div
                    className="connection-handle absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white cursor-crosshair hover:bg-blue-500 transition-colors"
                    onMouseUp={(e) => onConnectionEnd(node.id, e)}
                />

                {/* Node Header */}
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1 rounded ${nodeConfig?.color || 'bg-gray-500'}`}>
                        <IconComponent className="w-4 h-4 text-white"/>
                    </div>
                    <div className="font-medium text-sm text-gray-800 flex-1">
                        {nodeConfig?.label}
                    </div>

                    {/* Configuration Warning Icon */}
                    {!nodeHasActions && (
                        <div title="No action configured">
                            <AlertTriangle className="w-4 h-4 text-yellow-500"/>
                        </div>
                    )}

                    <button
                        onClick={handleDeleteClick}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Delete node"
                    >
                        <Trash2 className="w-3 h-3"/>
                    </button>
                </div>

                {/* Node Name */}
                <div className="text-xs text-gray-600 mb-2 font-medium">
                    {node.name || `${nodeConfig?.label} Node`}
                </div>

                {/* Node Actions Status */}
                {nodeHasActions ? (
                    <div className="text-xs text-green-600 mb-2 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Action: {configuredActionKey}</span>
                    </div>
                ) : (
                    <div className="text-xs text-yellow-600 mb-2 flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span>No action configured</span>
                    </div>
                )}

                {/* Status Indicator */}
                {node.status && node.status !== 'idle' && (
                    <div className={`text-xs px-2 py-1 rounded-full inline-block border ${getStatusColor()}`}>
                        {node.status}
                    </div>
                )}

                {/* Output Handle - Only show if node has configured actions */}
                <div
                    className={`connection-handle absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white cursor-crosshair transition-colors ${
                        nodeHasActions
                            ? 'bg-green-400 hover:bg-green-500'
                            : 'bg-gray-300 cursor-not-allowed'
                    }`}
                    onMouseDown={(e) => {
                        if (nodeHasActions) {
                            handleConnectionHandleMouseDown(e, true);
                        } else {
                            e.stopPropagation();
                        }
                    }}
                    title={nodeHasActions ? 'Drag to create connection' : 'Configure an action first'}
                />
            </div>
        </div>
    );
};
