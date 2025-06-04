import React from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {
    Workflow,
    Settings,
    Plus,
    Zap,
    Menu,
    Bell,
    User,
    Search
} from 'lucide-react';

interface AppHeaderProps {
    onCreateWorkflow?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({onCreateWorkflow}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path);
    };

    const navigationItems = [
        {
            path: '/',
            label: 'Workflows Automation',
            icon: Workflow,
            description: 'Manage your automation workflows'
        },
        {
            path: '/integrations',
            label: 'Integrations',
            icon: Zap,
            description: 'Connect third-party services'
        }
    ];

    return (
        <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo and Navigation */}
                    <div className="flex items-center">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center">
                            <div
                                className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Workflow className="h-5 w-5 text-white"/>
                            </div>
                            <a href='/'>
                                <span className="ml-2 text-xl font-bold text-gray-900">OctoFlow</span>
                            </a>
                        </div>
                    </div>

                    {/* Search Bar */}


                    {/* Right side actions */}
                    <div className="flex items-center space-x-4">

                        {navigationItems.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                                        isActive(item.path)
                                            ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                    title={item.description}
                                >
                                    <IconComponent className="w-4 h-4 mr-2"/>
                                    {item.label}
                                </button>
                            );
                        })}

                        {/* Create Workflow Button */}
                        {(isActive('/') || isActive('/workflows')) && (
                            <button
                                onClick={onCreateWorkflow}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                                <Plus className="w-4 h-4 mr-2"/>
                                Create Automation
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t">
                    {navigationItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center w-full px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                                    isActive(item.path)
                                        ? 'text-blue-600 bg-blue-100'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <IconComponent className="w-5 h-5 mr-3"/>
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </header>
    );
};
