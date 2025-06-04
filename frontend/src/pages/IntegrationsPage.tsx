import React, {useState, useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';
import {
    Plus,
    CheckCircle,
    Settings,
    Trash2,
    TestTube,
    RefreshCw,
    Calendar,
    Brain,
    Zap
} from 'lucide-react';
import {Integration} from '../services/api';
import {integrationApiClient} from '../services/integrationApi';
import {GoogleCalendarIntegration} from '../components/integrations/GoogleCalendarIntegration';
import {OpenAIIntegration} from '../components/integrations/OpenAIIntegration';

const INTEGRATION_TEMPLATES = [
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        type: 'google_calendar',
        description: 'Connect with Google Calendar to trigger workflows based on events',
        icon: Calendar,
        category: 'calendar' as const,
        capabilities: ['Event Triggers', 'Calendar Management', 'Meeting Automation'],
    },
    {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        description: 'Integrate with OpenAI for AI-powered text processing and generation',
        icon: Brain,
        category: 'ai' as const,
        capabilities: ['Text Generation', 'Content Analysis', 'AI Processing'],
    },
];

interface IntegrationModalProps {
    integration: typeof INTEGRATION_TEMPLATES[0] | null;
    onClose: () => void;
    onSave: (integration: any) => void;
}

const IntegrationModal: React.FC<IntegrationModalProps> = ({integration, onClose, onSave}) => {
    if (!integration) return null;

    switch (integration.type) {
        case 'google_calendar':
            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <GoogleCalendarIntegration onClose={onClose} onSuccess={onSave}/>
                        </div>
                    </div>
                </div>
            );

        case 'openai':
            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <OpenAIIntegration onClose={onClose} onSuccess={onSave}/>
                        </div>
                    </div>
                </div>
            );

        default:
            return null;
    }
};

export const IntegrationsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIntegration, setSelectedIntegration] = useState<typeof INTEGRATION_TEMPLATES[0] | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Handle OAuth callback success
    useEffect(() => {
        const authStatus = searchParams.get('auth');
        const authType = searchParams.get('type');

        if (authStatus === 'success' && authType === 'google-calendar') {
            const tokens = localStorage.getItem('google-calendar-tokens');
            const config = localStorage.getItem('google-calendar-config');

            if (tokens && config) {
                completeGoogleCalendarSetup(JSON.parse(tokens), JSON.parse(config));
                localStorage.removeItem('google-calendar-tokens');
                localStorage.removeItem('google-calendar-config');
            }
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    const completeGoogleCalendarSetup = async (tokens: any, config: any) => {
        try {
            const integrationConfig = {
                integrationType: 'google_calendar',
                integrationName: config.integrationName || 'Google Calendar',
                integrationConfig: {
                    ...config,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                },
            };

            const response = await integrationApiClient.createGoogleCalendarIntegration(integrationConfig);

            if (response.success) {
                fetchIntegrations();
                alert('Google Calendar integration completed successfully!');
            } else {
                alert('Failed to complete Google Calendar integration: ' + response.message);
            }
        } catch (error) {
            console.error('Failed to complete Google Calendar setup:', error);
            alert('Failed to complete Google Calendar integration');
        }
    };

    const fetchIntegrations = async () => {
        setLoading(true);
        setError(null);

        try {
            let response = await integrationApiClient.getAllIntegrations();
            response = response.data;

            if (response.success && Array.isArray(response.data)) {
                setIntegrations(response.data);
            } else {
                setIntegrations([]);
                setError(response.message || 'Failed to fetch integrations');
            }
        } catch (err) {
            setError('Failed to connect to the server');
            setIntegrations([]);
            console.error('Error fetching integrations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const handleConnect = async (integration: any) => {
        fetchIntegrations();
        setSelectedIntegration(null);
    };

    const handleDisconnect = async (integration: Integration) => {
        if (!window.confirm(`Are you sure you want to disconnect ${integration.name}?`)) {
            return;
        }

        setActionLoading(integration.id);
        try {
            const response = await integrationApiClient.deleteIntegration(integration.id);
            alert(integration.integrationType + ' has been disconnected successfully.');
            fetchIntegrations();
        } catch (error) {
            alert('Failed to disconnect integration');
        } finally {
            setActionLoading(null);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2 text-gray-600">
                    <RefreshCw className="w-5 h-5 animate-spin"/>
                    <span>Loading integrations...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Integrations</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => fetchIntegrations()}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
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
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
                <p className="text-gray-600 mt-1">Connect third-party services to enhance your workflows</p>
            </div>

            {/* All Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {INTEGRATION_TEMPLATES.map((template) => {
                    const IconComponent = template.icon;
                    const isConnected = integrations.some(integration => integration.integrationType === template.type);
                    const connectedIntegration = integrations.find(integration => integration.integrationType === template.type);

                    return (
                        <div key={template.id}
                             className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow integration-box">
                            {/* Integration Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                                    <IconComponent
                                        className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-gray-600'}`}/>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                                    <p className="text-sm text-gray-600">{template.description}</p>
                                </div>
                                {/* Status Badge */}
                                {isConnected && (
                                    <div
                                        className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                        <CheckCircle className="w-3 h-3"/>
                                        Integrated
                                    </div>
                                )}
                            </div>

                            {/* Capabilities */}
                            <div className="mb-4">
                                <div className="flex flex-wrap gap-1">
                                    {template.capabilities.map(capability => (
                                        <span key={capability}
                                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {capability}
                    </span>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {isConnected ? (
                                    // Connected Integration Actions
                                    <>
                                        <button
                                            onClick={() => handleDisconnect(connectedIntegration!)}
                                            disabled={actionLoading === connectedIntegration?.id}
                                            className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4 inline mr-1"/>
                                            Disconnect
                                        </button>
                                    </>
                                ) : (
                                    // Available Integration Action
                                    <button
                                        onClick={() => setSelectedIntegration(template)}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4"/>
                                        Connect
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Integration Configuration Modal */}
            {selectedIntegration && (
                <IntegrationModal
                    integration={selectedIntegration}
                    onClose={() => setSelectedIntegration(null)}
                    onSave={handleConnect}
                />
            )}
        </div>
    );
};
