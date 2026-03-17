import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { ROLES } from '../../features/auth/types';
import {
    LayoutDashboard,
    Wallet,
    Settings,
    LogOut,
    BookOpen,
    CheckCircle,
    Bell,
    CreditCard,
    ShieldCheck,
    UserPlus,
    Link as LinkIcon,
    Map as MapIcon
} from 'lucide-react';
import { cn } from '../utils/cn';
import logo from '../../assets/logo.webp';

export function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        {
            label: 'Dashboard',
            href: user?.role === ROLES.AGENCY ? '/agency/dashboard' : (user?.role === ROLES.SUPER_ADMIN ? '/super-admin/dashboard' : '/admin/dashboard'),
            icon: LayoutDashboard,
            roles: [ROLES.AGENCY, ROLES.ADMIN, ROLES.SUPER_ADMIN],
        },
        {
            label: 'Wallet',
            href: '/agency/wallet',
            icon: Wallet,
            roles: [ROLES.AGENCY],
        },
        {
            label: 'Deposits',
            href: user?.role === ROLES.AGENCY ? '/agency/deposits' : '/admin/deposits',
            icon: CreditCard,
            roles: [ROLES.AGENCY, ROLES.ADMIN, ROLES.SUPER_ADMIN],
        },
        {
            label: 'Tours',
            href: user?.role === ROLES.SUPER_ADMIN ? '/super-admin/tours' : '/agency/tours',
            icon: BookOpen,
            roles: [ROLES.AGENCY, ROLES.SUPER_ADMIN],
        },
        {
            label: 'Bookings',
            href: '/agency/bookings',
            icon: CheckCircle,
            roles: [ROLES.AGENCY],
        },
        {
            label: 'Global Bookings',
            href: '/super-admin/bookings',
            icon: MapIcon,
            roles: [ROLES.SUPER_ADMIN],
        },
        {
            label: 'Direct Retail Link',
            href: '/super-admin/retail-booking',
            icon: LinkIcon,
            roles: [ROLES.SUPER_ADMIN],
        },
        {
            label: 'Notifications',
            href: '/agency/notifications',
            icon: Bell, // Need to import Bell
            roles: [ROLES.AGENCY],
        },
        {
            label: 'Verification',
            href: '/agency/verification',
            icon: ShieldCheck,
            roles: [ROLES.AGENCY],
        },
        {
            label: 'Verified Agencies',
            href: '/admin/verified-agencies',
            icon: ShieldCheck,
            roles: [ROLES.ADMIN],
        },
        {
            label: 'Agencies & KYC',
            href: '/super-admin/agency-verifications',
            icon: ShieldCheck,
            roles: [ROLES.SUPER_ADMIN],
        },
        {
            label: 'Events', // Temporary hack to replace index if needed, but let's just insert here
            href: '/super-admin/events',
            icon: BookOpen,
            roles: [ROLES.SUPER_ADMIN],
        }, // We insert Reports below
        {
            label: 'Reports & Analytics',
            href: user?.role === ROLES.SUPER_ADMIN ? '/super-admin/reports' : '/admin/reports',
            icon: CheckCircle, // Reusing imported CheckCircle as fallback for FileText if not imported
            roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
        },
        {
            label: 'Settings',
            href: user?.role === ROLES.SUPER_ADMIN ? '/super-admin/settings' : '/agency/settings',
            icon: Settings,
            roles: [ROLES.AGENCY, ROLES.SUPER_ADMIN],
        },
        {
            label: 'Staff',
            href: '/super-admin/staff',
            icon: UserPlus,
            roles: [ROLES.SUPER_ADMIN],
        },
    ];

    if (!user) return null;

    return (
        <aside id="sidebar" className="fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-brand-gray hidden lg:flex flex-col transform transition-transform duration-300 ease-in-out">
            {/* Sidebar Header / Logo */}
            <div className="h-16 flex items-center px-6 border-b border-brand-gray">
                <div className="flex items-center space-x-2">
                    <img src={logo} alt="EuOnTour" className="h-8 w-auto" />
                    <span className="text-lg font-bold text-brand-black tracking-tight">EuOnTour</span>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    if (!item.roles.includes(user.role)) return null;

                    return (
                        <NavLink
                            key={item.label}
                            to={item.href}
                            className={({ isActive }) =>
                                cn(
                                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-4 transition-colors",
                                    isActive
                                        ? "bg-red-50 text-brand-red border-brand-red"
                                        : "text-brand-dark hover:bg-gray-50 hover:text-brand-black border-transparent"
                                )
                            }
                        >
                            <item.icon className={cn("mr-3 flex-shrink-0 h-5 w-5", ({ isActive }: { isActive: boolean }) => isActive ? "text-brand-red" : "text-gray-400 group-hover:text-brand-black")} />
                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-brand-gray">
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-brand-red flex items-center justify-center text-white font-semibold text-xs">
                        {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-brand-black truncate max-w-[120px]">{user.agency?.name || user.email.split('@')[0]}</p>
                        <p className="text-xs text-brand-dark truncate max-w-[120px]">{user.role}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="mt-4 flex items-center gap-2 text-sm text-brand-dark hover:text-brand-red w-full">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}

// Helper icons
