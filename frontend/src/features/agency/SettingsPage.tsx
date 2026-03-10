import { useState } from 'react';
import { User, Settings as SettingsIcon } from 'lucide-react';
import { ProfileSettings } from '../settings/ProfileSettings';
import { GeneralSettings } from '../settings/GeneralSettings';

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">Account & Settings</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="w-full md:w-64 space-y-2 shrink-0">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'profile'
                                ? 'bg-gray-900 text-white shadow-md transform scale-[1.02]'
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-100'
                            }`}
                    >
                        <User className={`w-4 h-4 ${activeTab === 'profile' ? 'text-gray-300' : 'text-gray-400'}`} />
                        <span>My Profile</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('general')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'general'
                                ? 'bg-gray-900 text-white shadow-md transform scale-[1.02]'
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-100'
                            }`}
                    >
                        <SettingsIcon className={`w-4 h-4 ${activeTab === 'general' ? 'text-gray-300' : 'text-gray-400'}`} />
                        <span>General Settings</span>
                    </button>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'profile' && <ProfileSettings />}
                        {activeTab === 'general' && <GeneralSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
}
