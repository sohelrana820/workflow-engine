import {useState, useCallback, useRef, useEffect} from 'react';
import {
    WorkflowNode,
    Connection,
    WorkflowState,
    DragState,
    Position,
    NodeType,
    Workflow,
    ExecutionResult,
    NodeUpdateEvent,
    ConnectionCreateEvent
} from '../types/workflow';
import {
    createNewNode,
    validateConnection,
    generateConnectionId,
    convertNodesToWorkflowDefinition,
    loadWorkflowToNodes,
    debounce,
    createConnectionWithOutputData,
    getOptimalInputMapping
} from '../utils/helpers';

interface UseWorkflowReturn {
    workflowState: WorkflowState;
    currentWorkflow: Workflow | null;
    dragState: DragState;
    executionResult: ExecutionResult | null;
    isExecuting: boolean;
    canvasRef: React.RefObject<HTMLDivElement>;

    // Node operations
    addNode: (nodeType: NodeType, position: Position) => void;
    updateNode: (event: NodeUpdateEvent) => void;
    deleteNode: (nodeId: string) => void;
    moveNode: (nodeId: string, position: Position) => void;

    createConnection: (event: ConnectionCreateEvent) => boolean;
    deleteConnection: (connectionId: string) => void;
    updateConnection: (connectionId: string, updates: Partial<Connection>) => void;

    selectNode: (nodeId: string | null) => void;
    updateCanvasTransform: (scale: number, offset: Position) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;

    // Drag operations
    startDrag: (dragType: DragState['dragType'], startPos: Position, nodeId?: string) => void;
    updateDrag: (currentPos: Position) => void;
    endDrag: () => void;

    // Workflow operations
    setWorkflowName: (name: string) => void;
    exportWorkflow: () => Workflow;
    importWorkflow: (workflow: Workflow) => void;
    clearWorkflow: () => void;
    executeWorkflow: () => Promise<void>;

    // History operations
    undo: () => void;
    redo: () => void;

    // Computed values
    selectedNode: WorkflowNode | null;
    hasUnsavedChanges: boolean;
}

export const useWorkflow = (initialWorkflow?: Workflow): UseWorkflowReturn => {
    const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(
        initialWorkflow ?? null
    );

    // Core workflow state
    const [workflowState, setWorkflowState] = useState<WorkflowState>(() => {
        if (initialWorkflow) {
            const {nodes, connections} = loadWorkflowToNodes(initialWorkflow);
            return {
                nodes,
                connections,
                selectedNodeId: null,
                scale: 1,
                canvasOffset: {x: 0, y: 0},
                workflowName: initialWorkflow.name,
                isDirty: false
            };
        }

        return {
            nodes: [],
            connections: [],
            selectedNodeId: null,
            scale: 1,
            canvasOffset: {x: 0, y: 0},
            workflowName: '',
            isDirty: false
        };
    });

    // Drag state
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        dragType: null,
        dragStart: {x: 0, y: 0},
        connectionStart: null
    });

    // Execution state
    const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // History state
    const [history, setHistory] = useState<WorkflowState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Refs for performance
    const canvasRef = useRef<HTMLDivElement>(null);
    const autosaveTimeoutRef = useRef<NodeJS.Timeout>();

    // Mark workflow as dirty (unsaved changes)
    const markDirty = useCallback(() => {
        setWorkflowState(prev => ({...prev, isDirty: true}));
    }, []);

    // Update current workflow when state changes
    const updateCurrentWorkflow = useCallback(() => {
        const workflow = convertNodesToWorkflowDefinition(
            workflowState.nodes,
            workflowState.connections,
            workflowState.workflowName
        );
        //@todo setCurrentWorkflow(workflow);
    }, [workflowState.nodes, workflowState.connections, workflowState.workflowName]);

    // Add to history for undo/redo
    const addToHistory = useCallback((state: WorkflowState) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push({...state, isDirty: false});
            return newHistory.slice(-50); // Keep only last 50 states
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [historyIndex]);

    // Auto-save debounced function
    const debouncedAutosave = useCallback(
        debounce((workflow: Workflow) => {
        }, 2000),
        []
    );

    // Node management
    const addNode = useCallback((nodeType: NodeType, position: Position) => {
        const newNode = createNewNode(nodeType, position);

        setWorkflowState(prev => {
            const newState = {
                ...prev,
                nodes: [...prev.nodes, newNode],
                selectedNodeId: newNode.id
            };
            addToHistory(prev);
            return newState;
        });

        markDirty();
    }, [markDirty, addToHistory]);

    const updateNode = useCallback((event: NodeUpdateEvent) => {
        setWorkflowState(prev => {
            addToHistory(prev);

            const updatedNodes = prev.nodes.map(node =>
                node.id === event.nodeId ? {...node, ...event.updates} : node
            );

            // If node actions changed, update connections to pass new output data including upstream data
            const updatedNode = updatedNodes.find(n => n.id === event.nodeId);
            let updatedConnections = prev.connections;

            if (updatedNode && event.updates.actions) {
                // Update connections from this node to pass new output data plus all upstream data
                updatedConnections = prev.connections.map(conn => {
                    if (conn.sourceId === event.nodeId) {
                        const targetNode = updatedNodes.find(n => n.id === conn.targetId);
                        if (targetNode) {
                            // FIXED: Pass all 4 required parameters
                            const optimalInputs = getOptimalInputMapping(updatedNode, targetNode, updatedNodes, updatedConnections);
                            return {
                                ...conn,
                                input_data: optimalInputs
                            };
                        }
                    }
                    return conn;
                });
            }

            return {
                ...prev,
                nodes: updatedNodes,
                connections: updatedConnections
            };
        });

        markDirty();
    }, [markDirty, addToHistory]);

    const deleteNode = useCallback((nodeId: string) => {
        setWorkflowState(prev => {
            addToHistory(prev);
            return {
                ...prev,
                nodes: prev.nodes.filter(node => node.id !== nodeId),
                connections: prev.connections.filter(
                    conn => conn.sourceId !== nodeId && conn.targetId !== nodeId
                ),
                selectedNodeId: prev.selectedNodeId === nodeId ? null : prev.selectedNodeId
            };
        });

        markDirty();
    }, [markDirty, addToHistory]);

    const moveNode = useCallback((nodeId: string, position: Position) => {
        setWorkflowState(prev => ({
            ...prev,
            nodes: prev.nodes.map(node =>
                node.id === nodeId ? {...node, position} : node
            )
        }));

        markDirty();
    }, [markDirty]);

    // Enhanced connection management with automatic output data passing
    const createConnection = useCallback((event: ConnectionCreateEvent): boolean => {
        const validation = validateConnection(
            event.sourceId,
            event.targetId,
            workflowState.connections,
            workflowState.nodes
        );

        if (!validation.isValid) {
            console.warn('Invalid connection:', validation.error);
            // Show user-friendly error message
            alert(`Cannot create connection: ${validation.error}`);
            return false;
        }

        // Get source and target nodes
        const sourceNode = workflowState.nodes.find(n => n.id === event.sourceId);
        const targetNode = workflowState.nodes.find(n => n.id === event.targetId);

        if (!sourceNode || !targetNode) {
            console.warn('Source or target node not found');
            return false;
        }

        // Enhanced: Automatically determine optimal input data mapping
        const connectionData = createConnectionWithOutputData(event.sourceId, event.targetId, workflowState.nodes, workflowState.connections);
        const optimalInputs = getOptimalInputMapping(sourceNode, targetNode, workflowState.nodes, workflowState.connections);

        const newConnection: Connection = {
            id: generateConnectionId(event.sourceId, event.targetId),
            sourceId: event.sourceId,
            targetId: event.targetId,
            condition: event.condition || 'always',
            input_data: optimalInputs, // Keep this for data flow
            label: 'Success' // ADD: Simple default label
        };


        setWorkflowState(prev => {
            addToHistory(prev);
            return {
                ...prev,
                connections: [...prev.connections, newConnection]
            };
        });

        markDirty();


        return true;
    }, [workflowState.connections, workflowState.nodes, markDirty, addToHistory]);

    const deleteConnection = useCallback((connectionId: string) => {
        setWorkflowState(prev => {
            addToHistory(prev);
            return {
                ...prev,
                connections: prev.connections.filter(conn => conn.id !== connectionId)
            };
        });

        markDirty();
    }, [markDirty, addToHistory]);

    const updateConnection = useCallback((connectionId: string, updates: Partial<Connection>) => {
        setWorkflowState(prev => {
            addToHistory(prev);
            return {
                ...prev,
                connections: prev.connections.map(conn =>
                    conn.id === connectionId ? {...conn, ...updates} : conn
                )
            };
        });

        markDirty();
    }, [markDirty, addToHistory]);

    // Selection management
    const selectNode = useCallback((nodeId: string | null) => {
        setWorkflowState(prev => ({
            ...prev,
            selectedNodeId: nodeId
        }));
    }, []);

    // Canvas management
    const updateCanvasTransform = useCallback((scale: number, offset: Position) => {
        setWorkflowState(prev => ({
            ...prev,
            scale: Math.max(0.1, Math.min(3, scale)),
            canvasOffset: offset
        }));
    }, []);

    const zoomIn = useCallback(() => {
        setWorkflowState(prev => ({
            ...prev,
            scale: Math.min(3, prev.scale + 0.1)
        }));
    }, []);

    const zoomOut = useCallback(() => {
        setWorkflowState(prev => ({
            ...prev,
            scale: Math.max(0.1, prev.scale - 0.1)
        }));
    }, []);

    const resetZoom = useCallback(() => {
        setWorkflowState(prev => ({
            ...prev,
            scale: 1,
            canvasOffset: {x: 0, y: 0}
        }));
    }, []);

    // Drag operations
    const startDrag = useCallback((dragType: DragState['dragType'], startPos: Position, nodeId?: string) => {
        setDragState({
            isDragging: true,
            dragType,
            dragStart: startPos,
            connectionStart: nodeId || null
        });
    }, []);

    const updateDrag = useCallback((currentPos: Position) => {
        if (!dragState.isDragging) return;

        if (dragState.dragType === 'canvas') {
            const deltaX = currentPos.x - dragState.dragStart.x;
            const deltaY = currentPos.y - dragState.dragStart.y;

            setWorkflowState(prev => ({
                ...prev,
                canvasOffset: {
                    x: prev.canvasOffset.x + deltaX,
                    y: prev.canvasOffset.y + deltaY
                }
            }));

            setDragState(prev => ({
                ...prev,
                dragStart: currentPos
            }));
        }
    }, [dragState]);

    const endDrag = useCallback(() => {
        setDragState({
            isDragging: false,
            dragType: null,
            dragStart: {x: 0, y: 0},
            connectionStart: null
        });
    }, []);

    // Workflow operations
    const setWorkflowName = useCallback((name: string) => {
        setWorkflowState(prev => ({
            ...prev,
            workflowName: name
        }));
        markDirty();
    }, [markDirty]);

    const exportWorkflow = useCallback((): Workflow => {
        return convertNodesToWorkflowDefinition(
            workflowState.nodes,
            workflowState.connections,
            workflowState.workflowName
        );
    }, [workflowState]);

    const importWorkflow = useCallback((workflow: Workflow) => {
        const {nodes, connections} = loadWorkflowToNodes(workflow);

        setCurrentWorkflow(workflow);
        setWorkflowState(prev => {
            addToHistory(prev);
            return {
                nodes,
                connections,
                selectedNodeId: null,
                scale: 1,
                canvasOffset: {x: 0, y: 0},
                workflowName: workflow.name,
                isDirty: false
            };
        });
    }, [addToHistory]);

    const clearWorkflow = useCallback(() => {
        setCurrentWorkflow(null);
        setWorkflowState(prev => {
            addToHistory(prev);
            return {
                nodes: [],
                connections: [],
                selectedNodeId: null,
                scale: 1,
                canvasOffset: {x: 0, y: 0},
                workflowName: '',
                isDirty: false
            };
        });
    }, [addToHistory]);

    // Enhanced execution with better output data tracking
    const executeWorkflow = useCallback(async (): Promise<void> => {
        if (isExecuting) return;

        setIsExecuting(true);
        setExecutionResult({
            status: 'running',
            message: 'Workflow execution started...'
        });

        try {
            const workflow = exportWorkflow();

            // Get the actual nodes array (since workflow.nodes might be string or array)
            const workflowNodes = Array.isArray(workflow.nodes) ? workflow.nodes : workflowState.nodes;

            // Update node statuses to running
            setWorkflowState(prev => ({
                ...prev,
                nodes: prev.nodes.map(node => ({
                    ...node,
                    status: 'running' as const
                }))
            }));

            // Simulate API call with enhanced tracking
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Enhanced mock execution result with output data tracking
            const mockResult: ExecutionResult = {
                status: 'completed',
                execution_id: Date.now().toString(),
                steps_executed: workflowNodes.length,
                execution_time: '2.3s',
                results: {
                    nodes_processed: workflowNodes.map((node: WorkflowNode) => {
                        // Simulate output data based on node type and configuration
                        const mockOutput = {
                            nodeId: node.id,
                            nodeName: node.name,
                            outputData: {} as Record<string, any>,
                            passedToNext: [] as Array<{
                                targetNodeId: string;
                                inputData: string[];
                            }>
                        };

                        // Get connections from this node
                        const outgoingConnections = workflowState.connections.filter(c => c.sourceId === node.id);
                        mockOutput.passedToNext = outgoingConnections.map(conn => ({
                            targetNodeId: conn.targetId,
                            inputData: conn.input_data
                        }));

                        return {
                            id: node.id,
                            status: 'completed',
                            output: mockOutput
                        };
                    })
                }
            };

            setExecutionResult(mockResult);

            // Update node statuses
            setWorkflowState(prev => ({
                ...prev,
                nodes: prev.nodes.map(node => ({
                    ...node,
                    status: 'completed' as const
                }))
            }));
        } catch (error) {
            setExecutionResult({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Update node statuses to failed
            setWorkflowState(prev => ({
                ...prev,
                nodes: prev.nodes.map(node => ({
                    ...node,
                    status: 'failed' as const
                }))
            }));
        } finally {
            setIsExecuting(false);
        }
    }, [isExecuting, exportWorkflow, workflowState.connections, workflowState.nodes]);

    // History operations
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const previousState = history[historyIndex - 1];
            setWorkflowState(previousState);
            setHistoryIndex(prev => prev - 1);
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setWorkflowState(nextState);
            setHistoryIndex(prev => prev + 1);
        }
    }, [history, historyIndex]);

    // Update currentWorkflow when workflowState changes
    useEffect(() => {
        updateCurrentWorkflow();
    }, [updateCurrentWorkflow]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            redo();
                        } else {
                            e.preventDefault();
                            undo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        redo();
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Auto-save effect
    useEffect(() => {
        if (workflowState.isDirty && workflowState.workflowName) {
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }

            autosaveTimeoutRef.current = setTimeout(() => {
                const workflow = exportWorkflow();
                debouncedAutosave(workflow);
            }, 5000);
        }

        return () => {
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, [workflowState.isDirty, workflowState.workflowName, exportWorkflow, debouncedAutosave]);

    return {
        // State
        workflowState,
        currentWorkflow,
        dragState,
        executionResult,
        isExecuting,
        canvasRef,

        // Node operations
        addNode,
        updateNode,
        deleteNode,
        moveNode,

        // Connection operations
        createConnection,
        deleteConnection,
        updateConnection,

        // Selection
        selectNode,

        // Canvas operations
        updateCanvasTransform,
        zoomIn,
        zoomOut,
        resetZoom,

        // Drag operations
        startDrag,
        updateDrag,
        endDrag,

        // Workflow operations
        setWorkflowName,
        exportWorkflow,
        importWorkflow,
        clearWorkflow,
        executeWorkflow,

        // History operations
        undo,
        redo,

        // Computed values
        selectedNode: workflowState.nodes.find(n => n.id === workflowState.selectedNodeId) || null,
        hasUnsavedChanges: workflowState.isDirty
    };
};
