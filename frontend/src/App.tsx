import React from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams} from 'react-router-dom';
import {AppHeader} from './components/AppHeader';
import {WorkflowBuilder} from './components/workflows/WorkflowBuilder';
import {WorkflowsPage} from './pages/WorkflowsPage';
import {IntegrationsPage} from './pages/IntegrationsPage';
import {OAuthCallbackHandler} from './components/auth/OAuthCallbackHandler';
import {Workflow} from './types/workflow';
import {apiClient} from './services/api';

const WorkflowBuilderPage: React.FC = () => {
    const navigate = useNavigate();
    const {id} = useParams<{ id?: string }>();
    const [initialWorkflow, setInitialWorkflow] = React.useState<Workflow | undefined>();
    const [loading, setLoading] = React.useState(!!id);

    React.useEffect(() => {
        if (id && id !== 'new') {
            const fetchWorkflow = async () => {
                try {
                    const response = await apiClient.getWorkflow(id);
                    const workflowRes = response.data;
                    if (workflowRes.success && workflowRes.data) {
                        setInitialWorkflow(workflowRes.data);
                    } else {
                        console.error('Failed to fetch workflow:', response.message);
                        navigate('/');
                    }
                } catch (error) {
                    console.error('Error fetching workflow:', error);
                    navigate('/');
                } finally {
                    setLoading(false);
                }
            };

            fetchWorkflow();
        } else {
            setLoading(false);
        }
    }, [id, navigate]);

    const handleSave = async (workflow: Workflow) => {
        try {
            let response;
            if (id && id !== 'new') {
                response = await apiClient.updateWorkflow(id, workflow);
            } else {
                response = await apiClient.createWorkflow(workflow);
            }

            if (response.success) {
                alert('Workflow saved successfully!');
                navigate('/');
            } else {
                alert('Failed to save workflow: ' + response.message);
            }
        } catch (error) {
            console.error('Error saving workflow:', error);
            alert('Failed to save workflow');
        }
    };

    const handleExecute = async (workflow: Workflow | null) => {
        if (workflow) {
            try {
                await apiClient.executeWorkflow(workflow.id);
            } catch (error) {
                console.error('Error executing workflow:', error);
            }
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading workflow...</p>
                </div>
            </div>
        );
    }

    return (
        <WorkflowBuilder
            initialWorkflow={initialWorkflow}
            onSave={handleSave}
            onBack={handleBack}
            onExecute={handleExecute}
        />
    );
};

const GoogleCalendarCallbackPage: React.FC = () => {
    return <OAuthCallbackHandler integrationType="google-calendar"/>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const navigate = useNavigate();

    const handleCreateWorkflow = () => {
        navigate('/workflow-builder/new');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader onCreateWorkflow={handleCreateWorkflow}/>
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
};

const SettingsPage: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚙️</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Coming Soon</h3>
                    <p className="text-gray-600">
                        We're working on comprehensive settings to help you customize your workflow automation
                        experience.
                    </p>
                </div>
            </div>
        </div>
    );
};

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                    <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
                    <p className="text-gray-600 mb-8">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/')}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Go to Workflows
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = {hasError: false};
    }

    static getDerivedStateFromError(error: Error) {
        return {hasError: true, error};
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Application error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                    <div className="sm:mx-auto sm:w-full sm:max-w-md">
                        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                            <div className="text-center">
                                <div
                                    className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">⚠️</span>
                                </div>
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
                                <p className="text-gray-600 mb-4">
                                    An unexpected error occurred. Please refresh the page and try again.
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Refresh Page
                                </button>
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <details className="mt-4 text-left">
                                        <summary className="cursor-pointer text-sm text-gray-500">Error Details
                                        </summary>
                                        <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                      {this.state.error.stack}
                    </pre>
                                    </details>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <Router>
                <Routes>
                    {/* Routes that use the main layout */}
                    <Route path="/" element={
                        <Layout>
                            <WorkflowsPage/>
                        </Layout>
                    }/>

                    <Route path="/integrations" element={
                        <Layout>
                            <IntegrationsPage/>
                        </Layout>
                    }/>

                    <Route path="/settings" element={
                        <Layout>
                            <SettingsPage/>
                        </Layout>
                    }/>

                    {/* OAuth Callback Routes */}
                    <Route path="/auth/google-calendar/callback" element={<GoogleCalendarCallbackPage/>}/>

                    {/* Workflow builder route (full screen) */}
                    <Route path="/workflow-builder/:id" element={<WorkflowBuilderPage/>}/>

                    {/* Legacy redirect for compatibility */}
                    <Route path="/workflows" element={<Navigate to="/" replace/>}/>

                    {/* 404 pages */}
                    <Route path="*" element={<NotFoundPage/>}/>
                </Routes>
            </Router>
        </ErrorBoundary>
    );
};

export default App;
