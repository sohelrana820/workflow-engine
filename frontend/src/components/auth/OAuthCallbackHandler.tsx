import React, {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {RefreshCw, CheckCircle, XCircle} from 'lucide-react';
import {integrationApiClient} from '../../services/integrationApi';

interface OAuthCallbackHandlerProps {
    integrationType: 'google-calendar';
}

export const OAuthCallbackHandler: React.FC<OAuthCallbackHandlerProps> = ({integrationType}) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing authentication...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const error = searchParams.get('error');

                if (error) {
                    setStatus('error');
                    setMessage(`Authentication failed: ${error}`);
                    return;
                }
                if (!code) {
                    setStatus('error');
                    setMessage('Missing authentication parameters');
                    return;
                }

                if (integrationType === 'google-calendar') {
                    const response = await integrationApiClient.completeGoogleCalendarAuth(code, '11');
                    if (response.success) {
                        localStorage.setItem('google-calendar-tokens', JSON.stringify({
                            accessToken: response.data.accessToken,
                            refreshToken: response.data.refreshToken,
                        }));

                        setStatus('success');
                        setMessage('Authentication successful! Redirecting...');

                        setTimeout(() => {
                            navigate('/integrations?auth=success&type=google-calendar');
                        }, 2000);
                    } else {
                        setStatus('error');
                        setMessage(response.message || 'Authentication failed');
                    }
                }
            } catch (err) {
                setStatus('error');
                setMessage('An unexpected error occurred');
            }
        };

        handleCallback();
    }, [searchParams, integrationType, navigate]);

    const getStatusIcon = () => {
        switch (status) {
            case 'processing':
                return <RefreshCw className="w-8 h-8 text-blue-600 animate-spin"/>;
            case 'success':
                return <CheckCircle className="w-8 h-8 text-green-600"/>;
            case 'error':
                return <XCircle className="w-8 h-8 text-red-600"/>;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'processing':
                return 'text-blue-600';
            case 'success':
                return 'text-green-600';
            case 'error':
                return 'text-red-600';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            {getStatusIcon()}
                        </div>

                        <h2 className={`text-xl font-semibold mb-2 ${getStatusColor()}`}>
                            {status === 'processing' && 'Processing Authentication'}
                            {status === 'success' && 'Authentication Successful'}
                            {status === 'error' && 'Authentication Failed'}
                        </h2>

                        <p className="text-gray-600 mb-6">{message}</p>

                        {status === 'error' && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/integrations')}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Back to Integrations
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {status === 'processing' && (
                            <div className="text-sm text-gray-500">
                                Please wait while we complete the authentication process...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
