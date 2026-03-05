import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

export function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await apiFetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const markAsRead = async (id: string, currentlyRead: boolean) => {
        if (currentlyRead) return;
        try {
            await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (title: string) => {
        if (!title || typeof title !== 'string') return <Info className="w-5 h-5 text-blue-500" />;
        const titleLower = title.toLowerCase();
        if (titleLower.includes('approve') || titleLower.includes('success')) {
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        }
        if (titleLower.includes('low') || titleLower.includes('warning') || titleLower.includes('reject')) {
            return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
        }
        return <Info className="w-5 h-5 text-blue-500" />;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Unknown Date';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading notifications...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6 space-x-3">
                <div className="bg-brand-light p-2 rounded-full">
                    <Bell className="w-6 h-6 text-brand-red" />
                </div>
                <h1 className="text-3xl font-bold text-brand-black">Notifications</h1>
            </div>

            <div className="space-y-4">
                {notifications.map((notification) => (
                    <Card
                        key={notification.id}
                        className={`transition-colors cursor-pointer ${notification.read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}
                        onClick={() => markAsRead(notification.id, notification.read)}
                    >
                        <CardContent className="p-4 sm:p-6 flex items-start space-x-4">
                            <div className="flex-shrink-0 mt-1">
                                {getIcon(notification.title)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`text-base font-semibold ${notification.read ? 'text-gray-900' : 'text-brand-black'}`}>
                                        {notification.title}
                                    </h3>
                                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                        {formatDate(notification.createdAt)}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                    {notification.message}
                                </p>
                            </div>
                            {!notification.read && (
                                <div className="flex-shrink-0 m-auto pl-4">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {notifications.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No new notifications</p>
                    </div>
                )}
            </div>
        </div>
    );
}
