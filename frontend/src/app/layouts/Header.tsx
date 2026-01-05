import { useAuth } from '../../features/auth/AuthContext';
import { Bell } from 'lucide-react';

export function Header() {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-white border-b border-brand-gray flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 sticky top-0">
            {/* Left: Mobile Menu Trigger (simplified for now) & Title */}
            <div className="flex items-center">
                <button className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-3">
                    <span className="sr-only">Open sidebar</span>
                    {/* Menu Icon */}
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="text-xl font-semibold text-brand-black">Dashboard Overview</h1>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-4">
                {/* Wallet Balance (Agency Only) */}
                {user?.role === 'AGENCY' && (
                    <div className="hidden sm:flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                        <span className="text-xs font-medium uppercase mr-2">Balance</span>
                        <span className="font-semibold text-sm">€ 2,450.00</span>
                    </div>
                )}

                {/* Notifications */}
                <button className="p-1 rounded-full text-gray-400 hover:text-brand-red focus:outline-none">
                    <span className="sr-only">View notifications</span>
                    <div className="relative">
                        <Bell className="h-6 w-6" />
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-brand-red ring-2 ring-white"></span>
                    </div>
                </button>

                {/* Profile Placeholder */}
                <div className="relative ml-3">
                    <button className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold border border-gray-300">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
