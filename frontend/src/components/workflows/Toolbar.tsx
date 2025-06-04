import React, {useRef} from 'react';
import {
    ArrowLeft,
    Play,
    Save,
    Upload,
    Download,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Undo,
    Redo,
    Settings,
    Eye,
    Grid,
    Maximize,
    Square,
    Circle
} from 'lucide-react';

interface ToolbarProps {
    workflowName: string;
    onWorkflowNameChange: (name: string) => void;
    onBack: () => void;
    onSave: () => void;
    onExecute: () => void;
    onImport: (file: File) => void;
    onExport: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onFitView?: () => void;
    scale: number;
    isExecuting?: boolean;
    hasUnsavedChanges?: boolean;
    executionResult?: any;
    canUndo?: boolean;
    canRedo?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
                                                    workflowName,
                                                    onWorkflowNameChange,
                                                    onBack,
                                                    onSave,
                                                    onExecute,
                                                    onImport,
                                                    onExport,
                                                    onZoomIn,
                                                    onZoomOut,
                                                    onResetZoom,
                                                    onUndo,
                                                    onRedo,
                                                    onFitView,
                                                    scale,
                                                    isExecuting = false,
                                                    hasUnsavedChanges = false,
                                                    executionResult,
                                                    canUndo = false,
                                                    canRedo = false
                                                }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImport(file);
            // Reset input value to allow importing the same file again
            event.target.value = '';
        }
    };

    const getExecutionStatusInfo = () => {
        if (!executionResult) return null;

        switch (executionResult.status) {
            case 'running':
                return {
                    color: 'text-blue-600 bg-blue-50 border-blue-200',
                    icon: Circle,
                    text: 'Running...',
                    animate: 'animate-pulse'
                };
            case 'completed':
                return {
                    color: 'text-green-600 bg-green-50 border-green-200',
                    icon: Circle,
                    text: `Completed (${executionResult.execution_time || 'N/A'})`,
                    animate: ''
                };
            case 'failed':
                return {
                    color: 'text-red-600 bg-red-50 border-red-200',
                    icon: Circle,
                    text: 'Failed',
                    animate: ''
                };
            default:
                return null;
        }
    };

    const statusInfo = getExecutionStatusInfo();

    return (
        <div className="bg-white border-b shadow-sm">
            {/* Main Toolbar */}
            <div className="px-4 py-3 flex items-center justify-between">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-100 rounded-md transition-colors"
                        title="Back to workflow list"
                    >
                        <ArrowLeft className="w-5 h-5"/>
                    </button>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={workflowName}
                            onChange={(e) => onWorkflowNameChange(e.target.value)}
                            placeholder="Enter workflow name"
                            className="text-xl font-semibold border-none outline-none bg-transparent hover:bg-gray-50 px-2 py-1 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                        />
                        {hasUnsavedChanges && (
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-xs text-orange-600 font-medium">Unsaved</span>
                            </div>
                        )}
                    </div>

                    {/* Status Indicator */}
                    {statusInfo && (
                        <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${statusInfo.color}`}>
                            <statusInfo.icon className={`w-3 h-3 ${statusInfo.animate}`}/>
                            <span className="font-medium">{statusInfo.text}</span>
                        </div>
                    )}
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    {/* Execution Controls */}
                    <div className="flex items-center gap-2 mr-2">
                        <button
                            onClick={onExecute}
                            disabled={isExecuting}
                            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 ${
                                isExecuting
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
                            }`}
                            title="Execute workflow"
                        >
                            <Play className={`w-4 h-4 ${isExecuting ? 'animate-pulse' : ''}`}/>
                            {isExecuting ? 'Running...' : 'Run'}
                        </button>
                    </div>

                    {/* File Operations */}
                    <div className="flex items-center gap-1 border-r pr-2 mr-2">
                        <button
                            onClick={onSave}
                            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 ${
                                hasUnsavedChanges
                                    ? 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'
                                    : 'bg-gray-500 text-white hover:bg-gray-600'
                            }`}
                            title={hasUnsavedChanges ? "Save changes" : "Save workflow"}
                        >
                            <Save className="w-4 h-4"/>
                            Save
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <button
                            onClick={handleImportClick}
                            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-2 transition-colors"
                            title="Import workflow from JSON"
                        >
                            <Upload className="w-4 h-4"/>
                            Import
                        </button>

                        <button
                            onClick={onExport}
                            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-2 transition-colors"
                            title="Export workflow as JSON"
                        >
                            <Download className="w-4 h-4"/>
                            Export
                        </button>
                    </div>

                    {/* View Controls */}
                    <div className="flex items-center gap-1">
                        {onFitView && (
                            <button
                                onClick={onFitView}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                                title="Fit to view"
                            >
                                <Maximize className="w-4 h-4"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Secondary Toolbar */}
            <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">
                {/* History Controls */}
                <div className="flex items-center gap-1">
                    {onUndo && (
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className={`p-2 rounded transition-colors ${
                                canUndo
                                    ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                    : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="w-4 h-4"/>
                        </button>
                    )}

                    {onRedo && (
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className={`p-2 rounded transition-colors ${
                                canRedo
                                    ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                    : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo className="w-4 h-4"/>
                        </button>
                    )}

                    {(onUndo || onRedo) && (
                        <div className="h-4 w-px bg-gray-300 mx-2"></div>
                    )}
                </div>

                {/* Center - Quick Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    {executionResult?.steps_executed && (
                        <span>Steps: {executionResult.steps_executed}</span>
                    )}
                    {executionResult?.execution_id && (
                        <span>ID: {executionResult.execution_id.slice(-8)}</span>
                    )}
                </div>

                {/* View Controls */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 mr-2">Zoom:</span>

                    <button
                        onClick={onZoomOut}
                        className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                        title="Zoom out (-)"
                    >
                        <ZoomOut className="w-4 h-4"/>
                    </button>

                    <button
                        onClick={onResetZoom}
                        className="text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 px-2 py-1 rounded transition-colors min-w-[60px] text-center"
                        title="Reset zoom (100%)"
                    >
                        {Math.round(scale * 100)}%
                    </button>

                    <button
                        onClick={onZoomIn}
                        className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                        title="Zoom in (+)"
                    >
                        <ZoomIn className="w-4 h-4"/>
                    </button>
                </div>
            </div>

            {/* Execution Progress Bar */}
            {isExecuting && (
                <div className="h-1 bg-gray-200">
                    <div className="h-full bg-blue-500 animate-pulse" style={{width: '100%'}}></div>
                </div>
            )}
        </div>
    );
};
