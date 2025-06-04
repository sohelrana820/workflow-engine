import React, {useMemo} from 'react';
import {WorkflowNode, Connection, Position} from '../../types/workflow';
import {NODE_TYPES} from '../../utils/helpers';

interface MiniMapProps {
    nodes: WorkflowNode[];
    connections: Connection[];
    canvasOffset: Position;
    scale: number;
    containerWidth: number;
    containerHeight: number;
    onViewportChange: (offset: Position) => void;
    className?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({
                                                    nodes,
                                                    connections,
                                                    canvasOffset,
                                                    scale,
                                                    containerWidth,
                                                    containerHeight,
                                                    onViewportChange,
                                                    className = ""
                                                }) => {
    const MINIMAP_SIZE = 200;
    const MINIMAP_SCALE = 0.1;

    const {bounds, minimapNodes, minimapConnections} = useMemo(() => {
        if (nodes.length === 0) {
            return {
                bounds: {minX: 0, minY: 0, maxX: 1000, maxY: 600},
                minimapNodes: [],
                minimapConnections: []
            };
        }

        // Calculate bounds
        const positions = nodes.map(n => n.position);
        const minX = Math.min(...positions.map(p => p.x)) - 100;
        const minY = Math.min(...positions.map(p => p.y)) - 100;
        const maxX = Math.max(...positions.map(p => p.x)) + 300;
        const maxY = Math.max(...positions.map(p => p.y)) + 200;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const aspectRatio = contentWidth / contentHeight;

        // Calculate minimap dimensions
        let minimapWidth = MINIMAP_SIZE;
        let minimapHeight = MINIMAP_SIZE;

        if (aspectRatio > 1) {
            minimapHeight = MINIMAP_SIZE / aspectRatio;
        } else {
            minimapWidth = MINIMAP_SIZE * aspectRatio;
        }

        const scaleX = minimapWidth / contentWidth;
        const scaleY = minimapHeight / contentHeight;
        const minimapScale = Math.min(scaleX, scaleY);

        // Transform nodes for minimap
        const minimapNodes = nodes.map(node => ({
            ...node,
            position: {
                x: (node.position.x - minX) * minimapScale,
                y: (node.position.y - minY) * minimapScale
            }
        }));

        // Transform connections for minimap
        const minimapConnections = connections.map(conn => {
            const sourceNode = nodes.find(n => n.id === conn.sourceId);
            const targetNode = nodes.find(n => n.id === conn.targetId);

            if (!sourceNode || !targetNode) return null;

            return {
                ...conn,
                sourcePos: {
                    x: (sourceNode.position.x - minX) * minimapScale + 8, // offset for node center
                    y: (sourceNode.position.y - minY) * minimapScale + 8
                },
                targetPos: {
                    x: (targetNode.position.x - minX) * minimapScale + 8,
                    y: (targetNode.position.y - minY) * minimapScale + 8
                }
            };
        }).filter(Boolean);

        return {
            bounds: {minX, minY, maxX, maxY},
            minimapNodes,
            minimapConnections,
            minimapWidth,
            minimapHeight,
            minimapScale
        };
    }, [nodes, connections]);

    const viewportRect = useMemo(() => {
        const contentWidth = bounds.maxX - bounds.minX;
        const contentHeight = bounds.maxY - bounds.minY;
        const minimapScale = Math.min(MINIMAP_SIZE / contentWidth, MINIMAP_SIZE / contentHeight);

        const viewportX = (-canvasOffset.x / scale - bounds.minX) * minimapScale;
        const viewportY = (-canvasOffset.y / scale - bounds.minY) * minimapScale;
        const viewportWidth = (containerWidth / scale) * minimapScale;
        const viewportHeight = (containerHeight / scale) * minimapScale;

        return {
            x: Math.max(0, viewportX),
            y: Math.max(0, viewportY),
            width: Math.min(MINIMAP_SIZE, viewportWidth),
            height: Math.min(MINIMAP_SIZE, viewportHeight)
        };
    }, [bounds, canvasOffset, scale, containerWidth, containerHeight]);

    const handleMinimapClick = (event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const contentWidth = bounds.maxX - bounds.minX;
        const contentHeight = bounds.maxY - bounds.minY;
        const minimapScale = Math.min(MINIMAP_SIZE / contentWidth, MINIMAP_SIZE / contentHeight);

        // Convert minimap coordinates back to canvas coordinates
        const canvasX = (clickX / minimapScale + bounds.minX) * scale;
        const canvasY = (clickY / minimapScale + bounds.minY) * scale;

        // Center the viewport on the clicked position
        const newOffset = {
            x: -canvasX + containerWidth / 2,
            y: -canvasY + containerHeight / 2
        };

        onViewportChange(newOffset);
    };

    if (nodes.length === 0) {
        return (
            <div className={`bg-white border rounded-lg p-4 ${className}`}>
                <div className="text-xs text-gray-500 text-center">
                    No nodes to display
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white border rounded-lg p-2 ${className}`}>
            <div className="text-xs font-medium text-gray-700 mb-2">Overview</div>
            <div
                className="relative bg-gray-50 border rounded cursor-pointer"
                style={{width: MINIMAP_SIZE, height: MINIMAP_SIZE}}
                onClick={handleMinimapClick}
            >
                {/* Grid background */}
                <svg
                    className="absolute inset-0"
                    width={MINIMAP_SIZE}
                    height={MINIMAP_SIZE}
                >
                    <defs>
                        <pattern
                            id="minimap-grid"
                            width="10"
                            height="10"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 10 0 L 0 0 0 10"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#minimap-grid)"/>
                </svg>

                {/* Connections */}
                <svg className="absolute inset-0" width={MINIMAP_SIZE} height={MINIMAP_SIZE}>
                    {minimapConnections.map((conn: any) => (
                        <line
                            key={conn.id}
                            x1={conn.sourcePos.x}
                            y1={conn.sourcePos.y}
                            x2={conn.targetPos.x}
                            y2={conn.targetPos.y}
                            stroke="#9ca3af"
                            strokeWidth="1"
                        />
                    ))}
                </svg>

                {/* Nodes */}
                {minimapNodes.map(node => {
                    const nodeConfig = NODE_TYPES[node.type];
                    return (
                        <div
                            key={node.id}
                            className={`absolute w-4 h-4 rounded border-2 border-white ${
                                nodeConfig?.color || 'bg-gray-500'
                            }`}
                            style={{
                                left: node.position.x,
                                top: node.position.y,
                                transform: 'translate(-50%, -50%)'
                            }}
                            title={node.name}
                        />
                    );
                })}

                {/* Viewport indicator */}
                <div
                    className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none"
                    style={{
                        left: viewportRect.x,
                        top: viewportRect.y,
                        width: viewportRect.width,
                        height: viewportRect.height
                    }}
                />
            </div>

            {/* Stats */}
            <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>Nodes: {nodes.length}</div>
                <div>Connections: {connections.length}</div>
                <div>Zoom: {Math.round(scale * 100)}%</div>
            </div>
        </div>
    );
};
