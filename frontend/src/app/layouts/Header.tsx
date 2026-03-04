import { useAuth } from '../../features/auth/AuthContext';
import { Bell, Settings, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api-client';

export function Header() {
    const { user, logout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch unread count
        const fetchNotifications = async () => {
            try {
                const res = await apiFetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    const unread = data.notifications.filter((n: any) => !n.read).length;
                    setUnreadCount(unread);
                }
            } catch (error) {
                console.error("Failed to fetch notifications");
            }
        };
        fetchNotifications();
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="h-16 bg-white border-b border-brand-gray flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 sticky top-0">
            {/* Left: Mobile Menu Trigger (simplified for now) & Title */}
            <div className="flex items-center">
                <button className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-3">
                    <span className="sr-only">Open sidebar</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
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
                <Link to="/notifications" className="p-1 rounded-full text-gray-400 hover:text-brand-red focus:outline-none relative">
                    <span className="sr-only">View notifications</span>
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative ml-3" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red"
                    >
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold border border-gray-300">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </button>

                    {isProfileOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <Link
                                to={user?.role === 'SUPER_ADMIN' ? '/super-admin/settings' : '/settings'}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                Profile Settings
                            </Link>
                            <button
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    logout();
                                }}
                                className="w-full text-left block px-4 py-2 text-sm text-red-700 hover:bg-gray-100 flex items-center"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
