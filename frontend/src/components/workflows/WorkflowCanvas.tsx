import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {WorkflowNode} from './WorkflowNode';
import {WorkflowNode as WorkflowNodeType, Connection, Position, NodeType} from '../../types/workflow';

const ConnectionArrow: React.FC<{
    connection: Connection;
    nodes: WorkflowNodeType[];
    scale: number;
    onConnectionClick?: (connection: Connection) => void;
    isSelected?: boolean;
}> = ({connection, nodes, scale, onConnectionClick, isSelected = false}) => {
    const sourceNode = nodes.find(n => n.id === connection.sourceId);
    const targetNode = nodes.find(n => n.id === connection.targetId);

    if (!sourceNode || !targetNode) return null;

    const startX = sourceNode.position.x + 180;
    const startY = sourceNode.position.y + 24;
    const endX = targetNode.position.x;
    const endY = targetNode.position.y + 24;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    return (
        <>
            {/* SVG Connection Line */}
            <g>
                {/* Connection line */}
                <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={isSelected ? '#3b82f6' : '#666'}
                    strokeWidth="2"
                />

                {/* Connection label if it exists */}
                {connection.label && (
                    <text
                        x={midX}
                        y={midY - 25}
                        textAnchor="middle"
                        className="fill-gray-600 text-xs select-none"
                        style={{
                            fontSize: '10px',
                            pointerEvents: 'none'
                        }}
                    >
                        {connection.label}
                    </text>
                )}
            </g>

            {/* DOM-based Edit Button - positioned absolutely */}
            <div
                className={`absolute z-10 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none ${
                    isSelected ? 'bg-blue-500' : 'bg-red-500'
                } text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform shadow-lg border-2 border-white`}
                style={{
                    left: midX,
                    top: midY,
                }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onConnectionClick) {
                        onConnectionClick(connection);
                    }
                }}
            >
                EDIT
            </div>
        </>
    );
};

const GridBackground: React.FC<{
    width: number;
    height: number;
    scale: number;
    gridSize?: number;
}> = ({width, height, scale, gridSize = 20}) => {
    const adjustedGridSize = gridSize / scale;

    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
        >
            <defs>
                <pattern
                    id="grid-pattern"
                    width={adjustedGridSize}
                    height={adjustedGridSize}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${adjustedGridSize} 0 L 0 0 0 ${adjustedGridSize}`}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={1 / scale}
                        opacity={Math.min(1, scale)}
                    />
                </pattern>
                <pattern
                    id="grid-pattern-major"
                    width={adjustedGridSize * 5}
                    height={adjustedGridSize * 5}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${adjustedGridSize * 5} 0 L 0 0 0 ${adjustedGridSize * 5}`}
                        fill="none"
                        stroke="#d1d5db"
                        strokeWidth={2 / scale}
                        opacity={Math.min(0.5, scale)}
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)"/>
            <rect width="100%" height="100%" fill="url(#grid-pattern-major)"/>
        </svg>
    );
};

const EmptyStateInstructions: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
            className="text-center text-gray-400 bg-white/90 backdrop-blur-sm p-8 rounded-xl border-2 border-dashed border-gray-300 shadow-lg max-w-md">
            <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Start Building Your Workflow</h3>
            <p className="text-sm text-gray-500 mb-4">Create powerful automations by connecting nodes</p>
            <div className="text-xs text-gray-400 space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Drag nodes from the sidebar</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Connect nodes by dragging handles</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Click nodes to configure them</span>
                </div>
            </div>
        </div>
    </div>
);

// Canvas Overlay Components
const CanvasOverlays: React.FC<{
    scale: number;
    isConnecting: boolean;
    nodesCount: number;
    connectionsCount: number;
}> = ({scale, isConnecting, nodesCount, connectionsCount}) => (
    <>
        {/* Scale indicator */}
        <div
            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm border shadow-sm">
            <div className="flex items-center gap-2">
                <span className="text-gray-600">Zoom:</span>
                <span className="font-medium">{Math.round(scale * 100)}%</span>
            </div>
        </div>

        {/* Stats indicator */}
        <div
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm border shadow-sm">
            <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>Nodes: {nodesCount}</span>
                <span>Connections: {connectionsCount}</span>
            </div>
        </div>

        {/* Connection indicator */}
        {isConnecting && (
            <div
                className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm shadow-lg animate-pulse">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                    <span className="font-medium">Drag to another node to create connection</span>
                </div>
            </div>
        )}
    </>
);

// Main Canvas Interface
interface WorkflowCanvasProps {
    nodes: WorkflowNodeType[];
    connections: Connection[];
    selectedNodeId: string | null;
    selectedConnectionId?: string | null;
    scale: number;
    canvasOffset: Position;
    onNodeClick: (node: WorkflowNodeType | null) => void;
    onNodeDrag: (nodeId: string, position: Position) => void;
    onNodeDrop: (nodeType: NodeType, position: Position) => void;
    onConnectionStart: (nodeId: string, event: React.MouseEvent) => void;
    onConnectionEnd: (nodeId: string) => void;
    onConnectionClick?: (connection: Connection) => void; // FIXED: Keep this name consistent
    onDeleteNode: (nodeId: string) => void;
    onCanvasTransformUpdate: (scale: number, offset: Position) => void;
    onCanvasUpdate: (mousePos: Position, connecting: boolean, connStart: string | null) => void;
    isConnecting: boolean;
    connectionStart: string | null;
    mousePosition: Position;
    canvasRef: React.RefObject<HTMLDivElement>;
    gridEnabled?: boolean;
    snapToGrid?: boolean;
    readonly?: boolean;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
                                                                  nodes,
                                                                  connections,
                                                                  selectedNodeId,
                                                                  selectedConnectionId,
                                                                  scale,
                                                                  canvasOffset,
                                                                  onNodeClick,
                                                                  onNodeDrag,
                                                                  onNodeDrop,
                                                                  onConnectionStart,
                                                                  onConnectionEnd,
                                                                  onConnectionClick, // FIXED: Use consistent name
                                                                  onDeleteNode,
                                                                  onCanvasTransformUpdate,
                                                                  onCanvasUpdate,
                                                                  isConnecting,
                                                                  connectionStart,
                                                                  mousePosition,
                                                                  canvasRef,
                                                                  gridEnabled = true,
                                                                  snapToGrid = false,
                                                                  readonly = false
                                                              }) => {
    // Pan state
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<Position>({x: 0, y: 0});
    const [dragMode, setDragMode] = useState<'none' | 'pan' | 'select'>('none');

    // Calculate canvas dimensions
    const canvasDimensions = useMemo(() => {
        const minWidth = 3000;
        const minHeight = 1000;
        const padding = 200;

        if (nodes.length === 0) {
            return {width: minWidth, height: minHeight};
        }

        const maxX = Math.max(...nodes.map(n => n.position.x)) + padding;
        const maxY = Math.max(...nodes.map(n => n.position.y)) + padding;

        return {
            width: Math.max(minWidth, maxX),
            height: Math.max(minHeight, maxY)
        };
    }, [nodes]);

    // Snap to grid function
    const snapPositionToGrid = useCallback((position: Position, gridSize: number = 20): Position => {
        if (!snapToGrid) return position;

        return {
            x: Math.round(position.x / gridSize) * gridSize,
            y: Math.round(position.y / gridSize) * gridSize
        };
    }, [snapToGrid]);

    // Canvas interaction handlers - Fixed: Added canvasRef dependency
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        if (readonly) return;

        const target = e.target as HTMLElement;
        const isCanvasElement = target === canvasRef.current ||
            target.tagName === 'svg' ||
            target.closest('svg') ||
            target.classList.contains('canvas-background');

        if (isCanvasElement) {
            setIsPanning(true);
            setDragMode('pan');
            setPanStart({
                x: e.clientX - canvasOffset.x,
                y: e.clientY - canvasOffset.y
            });
            onNodeClick(null); // Deselect node
        }
    }, [canvasOffset, onNodeClick, readonly, canvasRef]);

    // Fixed: Added canvasRef dependency
    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        if (readonly && !isConnecting) return;

        if (isPanning && dragMode === 'pan') {
            const newOffset = {
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            };
            onCanvasTransformUpdate(scale, newOffset);
        }

        if (isConnecting && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const newMousePos = {
                x: (e.clientX - rect.left - canvasOffset.x) / scale,
                y: (e.clientY - rect.top - canvasOffset.y) / scale
            };
            onCanvasUpdate(newMousePos, isConnecting, connectionStart);
        }
    }, [isPanning, dragMode, panStart, isConnecting, canvasOffset, scale, onCanvasTransformUpdate, onCanvasUpdate, connectionStart, readonly, canvasRef]);

    const handleCanvasMouseUp = useCallback(() => {
        setIsPanning(false);
        setDragMode('none');

        if (isConnecting) {
            onCanvasUpdate(mousePosition, false, null);
        }
    }, [isConnecting, mousePosition, onCanvasUpdate]);

    // Global mouse event listeners for pan operations
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isPanning && dragMode === 'pan') {
                const newOffset = {
                    x: e.clientX - panStart.x,
                    y: e.clientY - panStart.y
                };
                onCanvasTransformUpdate(scale, newOffset);
            }
        };

        const handleGlobalMouseUp = () => {
            setIsPanning(false);
            setDragMode('none');
        };

        if (isPanning) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleGlobalMouseMove);
                document.removeEventListener('mouseup', handleGlobalMouseUp);
            };
        }
    }, [isPanning, dragMode, panStart, scale, onCanvasTransformUpdate]);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        if (readonly) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, [readonly]);

    // Fixed: Added canvasRef dependency
    const handleDrop = useCallback((e: React.DragEvent) => {
        if (readonly) return;
        e.preventDefault();

        const nodeType = e.dataTransfer.getData('text/plain') as NodeType;

        if (nodeType && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            let position = {
                x: (e.clientX - rect.left - canvasOffset.x) / scale,
                y: (e.clientY - rect.top - canvasOffset.y) / scale
            };

            // Snap to grid if enabled
            position = snapPositionToGrid(position);

            onNodeDrop(nodeType, position);
        }
    }, [canvasOffset, scale, onNodeDrop, snapPositionToGrid, readonly, canvasRef]);

    // Wheel handler for zooming - Fixed: Added canvasRef dependency
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (readonly) return;
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.1, Math.min(3, scale + delta));

        // Zoom towards mouse position
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const scaleRatio = newScale / scale;
            const newOffset = {
                x: mouseX - (mouseX - canvasOffset.x) * scaleRatio,
                y: mouseY - (mouseY - canvasOffset.y) * scaleRatio
            };

            onCanvasTransformUpdate(newScale, newOffset);
        }
    }, [scale, canvasOffset, onCanvasTransformUpdate, readonly, canvasRef]);

    // Connection handlers
    const handleConnectionStart = useCallback((nodeId: string, event: React.MouseEvent) => {
        if (readonly) return;
        onConnectionStart(nodeId, event);
    }, [onConnectionStart, readonly]);

    const handleConnectionEnd = useCallback((nodeId: string) => {
        if (readonly) return;
        onConnectionEnd(nodeId);
    }, [onConnectionEnd, readonly]);

    // Node drag handler with grid snapping
    const handleNodeDrag = useCallback((nodeId: string, position: Position) => {
        if (readonly) return;
        const snappedPosition = snapPositionToGrid(position);
        onNodeDrag(nodeId, snappedPosition);
    }, [onNodeDrag, snapPositionToGrid, readonly]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (readonly) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedNodeId) {
                    e.preventDefault();
                    onDeleteNode(selectedNodeId);
                }
            }

            if (e.key === 'Escape') {
                if (isConnecting) {
                    onCanvasUpdate(mousePosition, false, null);
                }
                onNodeClick(null);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeId, isConnecting, mousePosition, onDeleteNode, onNodeClick, onCanvasUpdate, readonly]);

    // Render temporary connection line - FIXED
    const renderTemporaryConnection = () => {
        if (!isConnecting || !connectionStart) return null;

        const sourceNode = nodes.find(n => n.id === connectionStart);
        if (!sourceNode) return null; // Fixed: Added null check

        const startX = sourceNode.position.x + 180;
        const startY = sourceNode.position.y + 24;

        return (
            <g>
                <path
                    d={`M ${startX} ${startY} L ${mousePosition.x} ${mousePosition.y}`}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    fill="none"
                    className="animate-pulse"
                />
                <circle
                    cx={mousePosition.x}
                    cy={mousePosition.y}
                    r="6"
                    fill="#3b82f6"
                    className="animate-pulse"
                />
                <circle
                    cx={startX}
                    cy={startY}
                    r="4"
                    fill="#3b82f6"
                />
            </g>
        );
    };

    const cursorStyle = useMemo(() => {
        if (readonly) return 'default';
        if (isPanning) return 'grabbing';
        if (isConnecting) return 'crosshair';
        return 'grab';
    }, [isPanning, isConnecting, readonly]);

    return (
        <div
            ref={canvasRef}
            className="w-full h-full overflow-hidden bg-gray-50 relative canvas-background"
            style={{cursor: cursorStyle}}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onWheel={handleWheel}
        >
            {/* Canvas content with transform */}
            <div
                style={{
                    transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
                    transformOrigin: '0 0',
                    width: 1800,
                    height: canvasDimensions.height
                }}
                className="relative"
            >
                {/* Grid background */}
                {gridEnabled && (
                    <GridBackground
                        width={canvasDimensions.width}
                        height={canvasDimensions.height}
                        scale={scale}
                    />
                )}

                {/* Connections layer - SVG lines with curved arrows */}
                <svg className="absolute inset-0 pointer-events-none" width={canvasDimensions.width}
                     height={canvasDimensions.height} style={{zIndex: 1}}>
                    <defs>
                        {/* Arrow marker definition - Always gray */}
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 10 3.5, 0 7"
                                fill="#9ca3af"
                            />
                        </marker>
                    </defs>

                    {connections.map(connection => {
                        const sourceNode = nodes.find(n => n.id === connection.sourceId);
                        const targetNode = nodes.find(n => n.id === connection.targetId);

                        if (!sourceNode || !targetNode) return null;

                        const startX = sourceNode.position.x + 180;
                        const startY = sourceNode.position.y + 24;
                        const endX = targetNode.position.x - 15; // Stop before the arrow
                        const endY = targetNode.position.y + 24;

                        // Calculate control points for curve
                        const dx = endX - startX;
                        const dy = endY - startY;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        // Curve intensity based on distance
                        const curveOffset = Math.min(distance * 0.3, 100);

                        // Control points for bezier curve
                        const cp1x = startX + curveOffset;
                        const cp1y = startY;
                        const cp2x = endX - curveOffset;
                        const cp2y = endY;

                        // Calculate midpoint on the curve for button positioning
                        const t = 0.5; // Middle of the curve
                        const midX = Math.pow(1 - t, 3) * startX +
                            3 * Math.pow(1 - t, 2) * t * cp1x +
                            3 * (1 - t) * Math.pow(t, 2) * cp2x +
                            Math.pow(t, 3) * endX;
                        const midY = Math.pow(1 - t, 3) * startY +
                            3 * Math.pow(1 - t, 2) * t * cp1y +
                            3 * (1 - t) * Math.pow(t, 2) * cp2y +
                            Math.pow(t, 3) * endY;

                        const isSelected = selectedConnectionId === connection.id;

                        return (
                            <g key={connection.id}>
                                {/* Curved connection line with arrow */}
                                <path
                                    d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
                                    stroke={isSelected ? '#3b82f6' : '#666'}
                                    strokeWidth="2"
                                    fill="none"
                                    markerEnd="url(#arrowhead)"
                                />

                                {/* Connection label if it exists - POSITIONED NEAR GEAR ICON */}
                                {connection.label && (
                                    <g>
                                        {/* Label background for better readability */}
                                        <rect
                                            x={midX - (connection.label.length * 3)}
                                            y={midY + 25} // Position below the gear icon
                                            width={connection.label.length * 6}
                                            height={14}
                                            fill="white"
                                            stroke="#e5e7eb"
                                            strokeWidth="1"
                                            rx="3"
                                            className="drop-shadow-sm"
                                        />
                                        {/* Label text */}
                                        <text
                                            x={midX}
                                            y={midY + 35} // Position below the gear icon
                                            textAnchor="middle"
                                            className="fill-gray-700 text-xs select-none font-medium"
                                            style={{
                                                fontSize: '10px',
                                                pointerEvents: 'none'
                                            }}
                                        >
                                            {connection.label}
                                        </text>
                                    </g>
                                )}

                                {/* Store midpoint for button positioning */}
                                <g data-mid-x={midX} data-mid-y={midY} className="connection-midpoint"/>
                            </g>
                        );
                    })}
                    {/* Temporary connection line */}
                    {renderTemporaryConnection()}
                </svg>

                {/* Connection Settings Buttons - DOM elements with gear icons */}
                <div className="absolute inset-0 pointer-events-none" style={{zIndex: 3}}>
                    {connections.map(connection => {
                        const sourceNode = nodes.find(n => n.id === connection.sourceId);
                        const targetNode = nodes.find(n => n.id === connection.targetId);

                        if (!sourceNode || !targetNode) return null;

                        const startX = sourceNode.position.x + 180;
                        const startY = sourceNode.position.y + 24;
                        const endX = targetNode.position.x - 15;
                        const endY = targetNode.position.y + 24;

                        // Calculate curve midpoint (same as above)
                        const dx = endX - startX;
                        const dy = endY - startY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const curveOffset = Math.min(distance * 0.3, 100);
                        const cp1x = startX + curveOffset;
                        const cp1y = startY;
                        const cp2x = endX - curveOffset;
                        const cp2y = endY;

                        const t = 0.5;
                        const midX = Math.pow(1 - t, 3) * startX +
                            3 * Math.pow(1 - t, 2) * t * cp1x +
                            3 * (1 - t) * Math.pow(t, 2) * cp2x +
                            Math.pow(t, 3) * endX;
                        const midY = Math.pow(1 - t, 3) * startY +
                            3 * Math.pow(1 - t, 2) * t * cp1y +
                            3 * (1 - t) * Math.pow(t, 2) * cp2y +
                            Math.pow(t, 3) * endY;

                        const isSelected = selectedConnectionId === connection.id;

                        return (
                            <div
                                key={`btn-${connection.id}`}
                                className={`absolute cursor-pointer select-none pointer-events-auto ${
                                    isSelected ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'
                                } text-white rounded-full w-7 h-7 flex items-center justify-center hover:scale-110 transition-all shadow-lg border-2 border-white`}
                                style={{
                                    left: midX - 14, // Center the 28px (w-7) button
                                    top: midY - 14,  // Center the 28px (h-7) button
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (onConnectionClick) {
                                        onConnectionClick(connection);
                                    }
                                }}
                                title="Configure connection conditions"
                            >
                                {/* Gear/Settings Icon */}
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </div>
                        );
                    })}
                </div>

                {/* Nodes layer */}
                <div className="absolute inset-0" style={{zIndex: 2}}>
                    {nodes.map(node => (
                        <WorkflowNode
                            key={node.id}
                            node={node}
                            isSelected={selectedNodeId === node.id}
                            scale={scale}
                            onNodeClick={onNodeClick}
                            onNodeDrag={handleNodeDrag}
                            onConnectionStart={handleConnectionStart}
                            onConnectionEnd={handleConnectionEnd}
                            onDeleteNode={onDeleteNode}
                        />
                    ))}
                </div>

                {/* Empty state instructions */}
                {nodes.length === 0 && !readonly && <EmptyStateInstructions/>}
            </div>

            {/* Canvas overlays */}
            <CanvasOverlays
                scale={scale}
                isConnecting={isConnecting}
                nodesCount={nodes.length}
                connectionsCount={connections.length}
            />

            {/* Selection box for future multi-select feature */}
            {dragMode === 'select' && (
                <div
                    className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
                    style={{
                        left: Math.min(panStart.x, mousePosition.x),
                        top: Math.min(panStart.y, mousePosition.y),
                        width: Math.abs(mousePosition.x - panStart.x),
                        height: Math.abs(mousePosition.y - panStart.y)
                    }}
                />
            )}

            {/* Performance indicator for large workflows */}
            {nodes.length > 50 && (
                <div
                    className="absolute bottom-4 left-4 bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm border border-yellow-300">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span>Large workflow: {nodes.length} nodes</span>
                    </div>
                </div>
            )}

            {/* Readonly indicator */}
            {readonly && (
                <div className="absolute top-4 left-4 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm border">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        <span>Read Only Mode</span>
                    </div>
                </div>
            )}
        </div>
    );
};
