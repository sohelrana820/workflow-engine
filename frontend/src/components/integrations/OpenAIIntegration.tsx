import React, {useState} from 'react';
import {Brain, Check, AlertCircle, RefreshCw} from 'lucide-react';
import {integrationApiClient, OpenAIConfig} from '../../services/integrationApi';

interface OpenAIIntegrationProps {
    onClose: () => void;
    onSuccess: (integration: any) => void;
    existingConfig?: OpenAIConfig;
    integrationId?: string;
}

export const OpenAIIntegration: React.FC<OpenAIIntegrationProps> = ({
                                                                        onClose,
                                                                        onSuccess,
                                                                        existingConfig,
                                                                        integrationId
                                                                    }) => {
    const [step, setStep] = useState<'config' | 'success'>('config');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [config, setConfig] = useState<OpenAIConfig>({
        apiKey: existingConfig?.apiKey || '',
        organizationId: existingConfig?.organizationId || '',
        model: existingConfig?.model || 'gpt-3.5-turbo',
    });

    const [integrationName, setIntegrationName] = useState('My OpenAI Integration');
    const [testPrompt, setTestPrompt] = useState('Say "Hello, this is a test!" in a creative way.');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!config.apiKey) {
            setError('Please provide your OpenAI API Key');
            return;
        }

        await createIntegration();
    };

    const createIntegration = async () => {
        setLoading(true);
        setError(null);

        try {
            const integrationConfig = {
                integrationType: 'openai',
                integrationName,
                integrationConfig: {
                    apiKey: config.apiKey,
                    organizationId: config.organizationId || undefined,
                    model: config.model,
                },
            };

            const response = await integrationApiClient.createOpenAIIntegration(integrationConfig);

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
            const response = await integrationApiClient.testOpenAIIntegration(integrationId);

            if (response.success) {
                alert(`Test successful! Connected to model: ${response.data.model || 'Unknown'}`);
            } else {
                setError(response.message || 'Test failed');
            }
        } catch (err) {
            setError('Test failed');
        } finally {
            setLoading(false);
        }
    };

    const testWithPrompt = async () => {
        if (!integrationId || !testPrompt) return;

        setLoading(true);
        setError(null);

        try {
            const response = await integrationApiClient.callOpenAI(integrationId, testPrompt, {
                model: config.model,
                maxTokens: 100,
                temperature: 0.7,
            });

            if (response.success && response.data.choices?.[0]?.message?.content) {
                alert(`AI Response: ${response.data.choices[0].message.content}`);
            } else {
                setError(response.message || 'Failed to get AI response');
            }
        } catch (err) {
            setError('Failed to get AI response');
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
                        Your OpenAI integration has been set up successfully.
                    </p>

                    {integrationId && (
                        <div className="mb-6 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Test Prompt
                                </label>
                                <textarea
                                    value={testPrompt}
                                    onChange={(e) => setTestPrompt(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Enter a test prompt..."
                                />
                            </div>
                            <button
                                onClick={testWithPrompt}
                                disabled={loading || !testPrompt}
                                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Testing...' : 'Test with Prompt'}
                            </button>
                        </div>
                    )}

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
                                {loading ? 'Testing...' : 'Test Connection'}
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
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-purple-600"/>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Connect OpenAI</h3>
                <p className="text-gray-600 text-sm mt-2">
                    Connect OpenAI to add AI-powered text processing to your workflows
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

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Integration Name
                    </label>
                    <input
                        type="text"
                        value={integrationName}
                        onChange={(e) => setIntegrationName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="My OpenAI Integration"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key *
                    </label>
                    <input
                        type="password"
                        value={config.apiKey}
                        onChange={(e) => setConfig(prev => ({...prev, apiKey: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="sk-..."
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Your OpenAI API key (starts with 'sk-')
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization ID (Optional)
                    </label>
                    <input
                        type="text"
                        value={config.organizationId}
                        onChange={(e) => setConfig(prev => ({...prev, organizationId: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="org-..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Optional: Your OpenAI Organization ID
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Model
                    </label>
                    <select
                        value={config.model}
                        onChange={(e) => setConfig(prev => ({...prev, model: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                        <option value="gpt-4o">GPT-4o</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Default model for AI processing (can be overridden per node)
                    </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-purple-900 mb-2">How to get your API Key:</h4>
                    <ol className="text-xs text-purple-800 space-y-1">
                        <li>1. Go to OpenAI Platform</li>
                        <li>2. Sign in to your account</li>
                        <li>3. Navigate to API Keys section</li>
                        <li>4. Create a new secret key</li>
                        <li>5. Copy and paste it here</li>
                    </ol>
                    <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs mt-2"
                    >
                        Open OpenAI Platform
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
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
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
