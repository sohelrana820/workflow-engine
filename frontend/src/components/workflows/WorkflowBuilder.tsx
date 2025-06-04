import React, {useCallback, useState} from 'react';
import {WorkflowCanvas} from './WorkflowCanvas';
import {NodeEditor} from './NodeEditor';
import {ConnectionEditor} from './ConnectionEditor';
import {Toolbar} from './Toolbar';
import {NodeActions} from './NodeActions';
import {MiniMap} from './MiniMap';
import {useWorkflow} from '../../hooks/useWorkflow';
import {Workflow, Position, NodeType, WorkflowNode, Connection} from '../../types/workflow';
import {downloadWorkflowAsJSON} from '../../utils/helpers';

const generateConnectionLabel = (connection: Partial<Connection>): string => {
    const {conditionType, conditionField, conditionValue} = connection;

    switch (conditionType) {
        case 'always':
            return '';
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

interface WorkflowBuilderProps {
    initialWorkflow?: Workflow;
    onSave: (workflow: Workflow) => void;
    onBack: () => void;
    onExecute: (workflow: Workflow | null) => void;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
                                                                    initialWorkflow,
                                                                    onSave,
                                                                    onBack,
                                                                    onExecute
                                                                }) => {
    const {
        workflowState,
        executionResult,
        isExecuting,
        canvasRef,
        addNode,
        updateNode,
        deleteNode,
        moveNode,
        createConnection,
        updateConnection,
        selectNode,
        updateCanvasTransform,
        zoomIn,
        zoomOut,
        resetZoom,
        setWorkflowName,
        exportWorkflow,
        importWorkflow,
        executeWorkflow,
        selectedNode,
        hasUnsavedChanges,
        undo,
        redo,
        currentWorkflow
    } = useWorkflow(initialWorkflow);

    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStart, setConnectionStart] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState<Position>({x: 0, y: 0});

    const handleNodeDrop = useCallback((nodeType: NodeType, position: Position) => {
        addNode(nodeType, position);
    }, [addNode]);

    // Handle connection creation
    const handleConnectionStart = useCallback((nodeId: string, event: React.MouseEvent) => {
        setIsConnecting(true);
        setConnectionStart(nodeId);

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setMousePosition({
                x: (event.clientX - rect.left - workflowState.canvasOffset.x) / workflowState.scale,
                y: (event.clientY - rect.top - workflowState.canvasOffset.y) / workflowState.scale
            });
        }
    }, [workflowState.canvasOffset, workflowState.scale, canvasRef]);

    const handleConnectionEnd = useCallback((nodeId: string) => {
        if (isConnecting && connectionStart && connectionStart !== nodeId) {
            createConnection({
                sourceId: connectionStart,
                targetId: nodeId,
                condition: 'always',
                input_data: []
            });
        }
        setIsConnecting(false);
        setConnectionStart(null);
    }, [isConnecting, connectionStart, createConnection]);

    // Handle connection click to open editor
    const handleConnectionClick = useCallback((connection: Connection) => {
        setSelectedConnection(connection);
        selectNode(null);
    }, [selectNode]);

    const handleConnectionUpdate = useCallback((connectionId: string, updates: Partial<Connection>) => {
        if (updates.conditionType || updates.conditionField || updates.conditionValue) {
            const tempConnection = {...updates} as Connection;
            const newLabel = generateConnectionLabel(tempConnection);
            updates.label = newLabel || undefined;
        }

        updateConnection(connectionId, updates);
        setSelectedConnection(null);
    }, [updateConnection]);

    const handleCanvasUpdate = useCallback((
        mousePos: Position,
        connecting: boolean,
        connStart: string | null
    ) => {
        setMousePosition(mousePos);
        setIsConnecting(connecting);
        setConnectionStart(connStart);
    }, []);

    const handleNodeClick = useCallback((node: WorkflowNode | null) => {
        selectNode(node ? node.id : null);
        setSelectedConnection(null); // Close connection editor when selecting node
    }, [selectNode]);

    const handleImport = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workflow = JSON.parse(e.target?.result as string);
                importWorkflow(workflow);
            } catch (error) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    }, [importWorkflow]);

    const handleExport = useCallback(() => {
        const workflow = exportWorkflow();
        downloadWorkflowAsJSON(workflow);
    }, [exportWorkflow]);

    const handleSave = useCallback(() => {
        const workflow = exportWorkflow();
        onSave(workflow);
    }, [exportWorkflow, onSave]);

    const handleExecute = useCallback(async () => {
        await executeWorkflow();
        onExecute(currentWorkflow);
    }, [executeWorkflow, currentWorkflow, onExecute]);

    const handleFitView = useCallback(() => {
        if (workflowState.nodes.length === 0) return;
        const positions = workflowState.nodes.map(n => n.position);
        const minX = Math.min(...positions.map(p => p.x)) - 100;
        const minY = Math.min(...positions.map(p => p.y)) - 100;
        const maxX = Math.max(...positions.map(p => p.x)) + 300;
        const maxY = Math.max(...positions.map(p => p.y)) + 200;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        const containerWidth = 800;
        const containerHeight = 600;

        const scaleX = containerWidth / contentWidth;
        const scaleY = containerHeight / contentHeight;
        const newScale = Math.min(scaleX, scaleY, 1) * 0.9;

        const offsetX = (containerWidth - contentWidth * newScale) / 2 - minX * newScale;
        const offsetY = (containerHeight - contentHeight * newScale) / 2 - minY * newScale;

        updateCanvasTransform(newScale, {x: offsetX, y: offsetY});
    }, [workflowState.nodes, updateCanvasTransform]);

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Toolbar */}
            <Toolbar
                workflowName={workflowState.workflowName}
                onWorkflowNameChange={setWorkflowName}
                onBack={onBack}
                onSave={handleSave}
                onExecute={handleExecute}
                onImport={handleImport}
                onExport={handleExport}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetZoom={resetZoom}
                onUndo={undo}
                onRedo={redo}
                onFitView={handleFitView}
                scale={workflowState.scale}
                isExecuting={isExecuting}
                hasUnsavedChanges={hasUnsavedChanges}
                executionResult={executionResult}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Node Library - FIXED WIDTH */}
                <div className="w-64 flex-shrink-0 bg-gray-50 border-r">
                    <NodeActions
                        onAddNode={addNode}
                        executionResult={executionResult}
                    />
                </div>

                {/* Canvas Area - FULL REMAINING WIDTH */}
                <div className="flex-1 relative bg-gray-100">
                    <WorkflowCanvas
                        nodes={workflowState.nodes}
                        connections={workflowState.connections}
                        selectedNodeId={workflowState.selectedNodeId}
                        selectedConnectionId={selectedConnection?.id}
                        scale={workflowState.scale}
                        canvasOffset={workflowState.canvasOffset}
                        onNodeClick={handleNodeClick}
                        onNodeDrag={moveNode}
                        onNodeDrop={handleNodeDrop}
                        onConnectionStart={handleConnectionStart}
                        onConnectionEnd={handleConnectionEnd}
                        onConnectionClick={handleConnectionClick}
                        onDeleteNode={deleteNode}
                        onCanvasTransformUpdate={updateCanvasTransform}
                        onCanvasUpdate={handleCanvasUpdate}
                        isConnecting={isConnecting}
                        connectionStart={connectionStart}
                        mousePosition={mousePosition}
                        canvasRef={canvasRef}
                    />

                    {/* MiniMap - Bottom Left Overlay */}
                    <div className="absolute bottom-4 left-4 z-10">
                        <MiniMap
                            nodes={workflowState.nodes}
                            connections={workflowState.connections}
                            canvasOffset={workflowState.canvasOffset}
                            scale={workflowState.scale}
                            containerWidth={800}
                            containerHeight={600}
                            onViewportChange={(offset) => updateCanvasTransform(workflowState.scale, offset)}
                        />
                    </div>

                    {/* Node Configuration Panel - Floating Overlay */}
                    {selectedNode && !selectedConnection && (
                        <div
                            className="absolute top-4 right-10 z-50 bg-white shadow-2xl border rounded-lg overflow-hidden w-96 max-h-[85vh]">
                            <NodeEditor
                                node={selectedNode}
                                allNodes={workflowState.nodes}
                                connections={workflowState.connections}
                                onUpdateNode={(nodeId, updates) => updateNode({nodeId, updates})}
                                onClose={() => selectNode(null)}
                            />
                        </div>
                    )}

                    {/* Connection Editor Panel - Floating Overlay */}
                    {selectedConnection && (
                        <div
                            className="absolute top-4 right-4 z-50 bg-white shadow-2xl border rounded-lg overflow-hidden w-96 max-h-[85vh]">
                            <ConnectionEditor
                                connection={selectedConnection}
                                sourceNode={workflowState.nodes.find(n => n.id === selectedConnection.sourceId) || null}
                                targetNode={workflowState.nodes.find(n => n.id === selectedConnection.targetId) || null}
                                onUpdateConnection={handleConnectionUpdate}
                                onClose={() => setSelectedConnection(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
