import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    Edit3,
    Copy,
    Trash2,
    Play,
    MoreVertical,
    Calendar,
    Clock,
    Activity,
    Search,
    Filter,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import {Workflow} from '../types/workflow';
import {apiClient, ApiResponse, WorkflowListResponse} from '../services/api';
import {getWorkflowTemplate} from "../utils/demoWorkflow";

export const WorkflowsPage: React.FC = () => {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'updated' | 'created'>('updated');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalWorkflows, setTotalWorkflows] = useState(0);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Fetch workflows from API
    const fetchWorkflows = async (page = 1) => {
        setLoading(true);
        setError(null);

        try {
            const response: ApiResponse<WorkflowListResponse> = await apiClient.getWorkflows(page, 10);


            if (response.success && response.data) {
                setWorkflows(response.data.workflows);
                setTotalWorkflows(response.data.total);
            } else {
                setError(response.message || 'Failed to fetch workflows');
            }
        } catch (err) {
            setError('Failed to connect to the server');
            console.error('Error fetching workflows:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows(currentPage);
    }, [currentPage]);

    // Handle workflow actions
    const handleEdit = (workflow: Workflow) => {
        navigate(`/workflow-builder/${workflow.id}`);
    };

    const handleCopy = async (workflow: Workflow) => {
        setActionLoading(workflow.id);
        try {
            const response = await apiClient.duplicateWorkflow(workflow.id);
            if (response.success) {
                fetchWorkflows(currentPage); // Refresh the list
            } else {
                alert('Failed to copy workflow: ' + response.message);
            }
        } catch (error) {
            alert('Failed to copy workflow');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (workflow: Workflow) => {
        if (!window.confirm(`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`)) {
            return;
        }

        setActionLoading(workflow.id);
        try {
            const response = await apiClient.deleteWorkflow(workflow.id);
            if (response.success) {
                fetchWorkflows(currentPage); // Refresh the list
            } else {
                alert('Failed to delete workflow: ' + response.message);
            }
        } catch (error) {
            alert('Failed to delete workflow');
        } finally {
            setActionLoading(null);
        }
    };

    const handleExecute = async (workflow: Workflow) => {
        setActionLoading(workflow.id);
        try {
            const response = await apiClient.executeWorkflow(workflow.id);
            if (response.success) {
                alert('Workflow execution started successfully!');
            } else {
                alert('Failed to execute workflow: ' + response.message);
            }
        } catch (error) {
            alert('Failed to execute workflow');
        } finally {
            setActionLoading(null);
        }
    };

    const installDemo = async () => {
        try {
            const demoWorkflow = getWorkflowTemplate();
            const response = await apiClient.createWorkflow(demoWorkflow);

            if (response.success) {
                alert('✅ Demo workflow installed successfully!');
                await fetchWorkflows(currentPage); // Refresh the workflow list
            } else {
                alert('❌ Failed to install demo workflow');
            }
        } catch (error) {
            console.error('Error installing demo workflow:', error);
            alert('❌ Failed to install demo workflow. Please try again.');
        }
    };

    // Filter and sort workflows
    const filteredWorkflows = workflows
        .filter(workflow => {
            const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'created':
                    return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
                case 'updated':
                default:
                    return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
            }
        });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'DRAFT':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'INACTIVE':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'QUEUED':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && workflows.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2 text-gray-600">
                    <RefreshCw className="w-5 h-5 animate-spin"/>
                    <span>Loading workflows...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4"/>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Workflows</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => fetchWorkflows(currentPage)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Workflow Automations</h1>
                <p className="text-gray-600 mt-1">Manage and execute your automation workflows</p>
            </div>

            {/* Filters and Search */}


            {/* Workflows List */}
            {filteredWorkflows.length === 0 ? (
                <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4"/>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {workflows.length === 0 ? 'No workflows yet' : 'No workflows match your filters'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {workflows.length === 0
                            ? 'Create your first workflow to get started with automation'
                            : 'Try adjusting your search or filter criteria'
                        }
                    </p>

                    <button onClick={() => installDemo()}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">Intall
                        Demo
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredWorkflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="bg-white border rounded-lg p-6 hover:shadow-md transition-all duration-200 hover:border-blue-200"
                        >
                            <div className="flex items-start justify-between align-items-center">
                                <div className="flex-1">
                                    {/* Workflow Header */}
                                    <div className="flex items-baseline gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(workflow.status)}`}>
                      {workflow.status}
                    </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-gray-600 text-sm mb-3">{workflow.description}</p>

                                    {/* Metadata */}
                                    <div className="flex items-center gap-6 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Activity className="w-3 h-3"/>
                                            <span>Version: {workflow.version}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span>Nodes: {workflow.nodes.length}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3"/>
                                            <span>Created: {formatDate(workflow.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3"/>
                                            <span>Updated: {formatDate(workflow.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 ml-4">
                                    {/*<button
                    onClick={() => handleExecute(workflow)}
                    disabled={actionLoading === workflow.id}
                    className="bg-green-500 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600 flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Execute workflow"
                  >
                    <Play className="w-3 h-3"/>
                    Run
                  </button>*/}

                                    <button
                                        onClick={() => handleEdit(workflow)}
                                        className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600 flex items-center gap-1 transition-colors"
                                        title="Edit workflow"
                                    >
                                        <Edit3 className="w-3 h-3"/>
                                        Edit
                                    </button>

                                    <button
                                        onClick={() => handleCopy(workflow)}
                                        disabled={actionLoading === workflow.id}
                                        className="bg-gray-500 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-600 flex items-center gap-1 transition-colors disabled:opacity-50"
                                        title="Copy workflow"
                                    >
                                        <Copy className="w-3 h-3"/>
                                        Copy
                                    </button>

                                    <button
                                        onClick={() => handleDelete(workflow)}
                                        disabled={actionLoading === workflow.id}
                                        className="bg-red-500 text-white px-3 py-1.5 rounded text-sm hover:bg-red-600 flex items-center gap-1 transition-colors disabled:opacity-50"
                                        title="Delete workflow"
                                    >
                                        <Trash2 className="w-3 h-3"/>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {Math.ceil(totalWorkflows / 10) > 1 && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalWorkflows)} of {totalWorkflows} workflows
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage >= Math.ceil(totalWorkflows / 10)}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
