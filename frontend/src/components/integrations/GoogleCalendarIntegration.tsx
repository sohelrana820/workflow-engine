import React, {useState, useEffect} from 'react';
import {Calendar, Check, AlertCircle, ExternalLink, RefreshCw} from 'lucide-react';
import {
    integrationApiClient,
    GoogleCalendarConfig,
    generateGoogleCalendarRedirectUri,
    parseGoogleCalendarCallback
} from '../../services/integrationApi';

interface GoogleCalendarIntegrationProps {
    onClose: () => void;
    onSuccess: (integration: any) => void;
    existingConfig?: GoogleCalendarConfig;
    integrationId?: string;
}

export const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
                                                                                        onClose,
                                                                                        onSuccess,
                                                                                        existingConfig,
                                                                                        integrationId
                                                                                    }) => {
    const [step, setStep] = useState<'config' | 'auth' | 'success'>('config');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [config, setConfig] = useState<GoogleCalendarConfig>({
        clientId: '371908452323-h77596v1oglbiunvp8hvviqfqs224o6g.apps.googleusercontent.com',
        clientSecret: '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',
        redirectUri: 'http://localhost:3012/auth/google-calendar/callback',
        accessToken: existingConfig?.accessToken,
        refreshToken: existingConfig?.refreshToken,
    });

    const [integrationName, setIntegrationName] = useState('My Google Calendar');
    const [authState, setAuthState] = useState<string>('');

    useEffect(() => {
        const handleCallback = async () => {
            const currentUrl = window.location.href;

            if (currentUrl.includes('/auth/google-calendar/callback')) {
                const callbackData = parseGoogleCalendarCallback(currentUrl);

                if (callbackData && authState) {
                    setLoading(true);
                    try {
                        const response = await integrationApiClient.completeGoogleCalendarAuth(
                            callbackData.code,
                            callbackData.state,
                        );

                        if (response.success && response.data) {
                            setConfig(prev => ({
                                ...prev,
                                accessToken: response.data.accessToken,
                                refreshToken: response.data.refreshToken,
                            }));

                            await createIntegration(response.data.accessToken, response.data.refreshToken);
                            window.history.replaceState({}, document.title, window.location.pathname);
                        } else {
                            setError(response.message || 'Failed to complete authentication');
                        }
                    } catch (err) {
                        setError('Failed to complete authentication');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        };

        handleCallback();
    }, [authState, config]);

    const handleConfigSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!config.clientId || !config.clientSecret) {
            setError('Please provide both Client ID and Client Secret');
            return;
        }

        if (config.accessToken && config.refreshToken) {
            // Already have tokens, create integration directly
            await createIntegration(config.accessToken, config.refreshToken);
        } else {
            await initiateAuth();
        }
    };

    const initiateAuth = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await integrationApiClient.initiateGoogleCalendarAuth(config);

            const resData: any = response.data;
            if (resData.success && resData.data) {
                setAuthState(resData.data.state);
                window.location.href = resData.data.authUrl;
            } else {
                setError(resData.message || 'Failed to initiate authentication');
                setLoading(false);
            }
        } catch (err) {
            setError('Failed to initiate authentication');
            setLoading(false);
        }
    };

    const createIntegration = async (accessToken: string, refreshToken: string) => {
        setLoading(true);
        setError(null);

        try {
            const integrationConfig = {
                integrationType: 'google_calendar',
                integrationName,
                integrationConfig: {
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    redirectUri: config.redirectUri,
                    accessToken,
                    refreshToken,
                },
            };

            const response = await integrationApiClient.createGoogleCalendarIntegration(integrationConfig);

            if (response.success && response.data) {
                setStep('success');
                onSuccess(response.data);
            } else {
                setError(response.message || 'Failed to create integration');
            }
        } catch (err) {
            setError('Failed to create integration');
        } finally {
            setLoading(false);
        }
    };

    const testIntegration = async () => {
        if (!integrationId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await integrationApiClient.testGoogleCalendarIntegration(integrationId);

            if (response.success) {
                alert(`Test successful! Found ${response.data.eventCount || 0} upcoming events.`);
            } else {
                setError(response.message || 'Test failed');
            }
        } catch (err) {
            setError('Test failed');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto">
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600"/>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Integration Successful!</h3>
                    <p className="text-gray-600 mb-6">
                        Your Google Calendar integration has been set up successfully.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={onClose}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Done
                        </button>
                        {integrationId && (
                            <button
                                onClick={testIntegration}
                                disabled={loading}
                                className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Testing...' : 'Test Integration'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-blue-600"/>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Connect Google Calendar</h3>
                <p className="text-gray-600 text-sm mt-2">
                    Connect your Google Calendar to trigger workflows based on events
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600"/>
                        <span className="text-red-700 text-sm">{error}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleConfigSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Integration Name
                    </label>
                    <input
                        type="text"
                        value={integrationName}
                        onChange={(e) => setIntegrationName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="My Google Calendar"
                        required
                    />
                </div>

                {/*<div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={config.clientId}
            onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Your Google OAuth Client ID"
            required
          />
        </div>*/}

                {/*<div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={config.clientSecret}
            onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Your Google OAuth Client Secret"
            required
          />
        </div>*/}

                {/*<div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Redirect URI
          </label>
          <input
            type="url"
            value={config.redirectUri}
            onChange={(e) => setConfig(prev => ({ ...prev, redirectUri: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="http://localhost:3000/auth/google-calendar/callback"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This must be configured in your Google Cloud Console
          </p>
        </div>*/}

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                    <ol className="text-xs text-blue-800 space-y-1">
                        <li>1. Go to Google Cloud Console</li>
                        <li>2. Create OAuth 2.0 credentials</li>
                        <li>3. Add the redirect URI above</li>
                        <li>4. Copy Client ID and Secret here</li>
                    </ol>
                    <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs mt-2"
                    >
                        Open Google Cloud Console
                        <ExternalLink className="w-3 h-3"/>
                    </a>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin"/>
                                Connecting...
                            </>
                        ) : (
                            'Connect'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
