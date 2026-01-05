import { Card, CardContent } from '../../app/components/ui/Card';
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
    {
        id: 1,
        title: 'Deposit Approved',
        message: 'Your deposit of €500.00 has been approved and credited to your wallet.',
        type: 'success',
        timestamp: '2 hours ago',
        read: false,
    },
    {
        id: 2,
        title: 'Booking Confirmed',
        message: 'Booking #BK-2026-001 for "Berlin Wall & Bike" has been confirmed.',
        type: 'info',
        timestamp: '1 day ago',
        read: true,
    },
    {
        id: 3,
        title: 'Low Balance Warning',
        message: 'Your wallet balance is below €100. Please top up to avoid service interruption.',
        type: 'warning',
        timestamp: '3 days ago',
        read: true,
    },
];

export function NotificationsPage() {
    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6 space-x-3">
                <div className="bg-brand-light p-2 rounded-full">
                    <Bell className="w-6 h-6 text-brand-red" />
                </div>
                <h1 className="text-3xl font-bold text-brand-black">Notifications</h1>
            </div>

            <div className="space-y-4">
                {MOCK_NOTIFICATIONS.map((notification) => (
                    <Card key={notification.id} className={`transition-colors ${notification.read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}>
                        <CardContent className="p-4 sm:p-6 flex items-start space-x-4">
                            <div className="flex-shrink-0 mt-1">
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`text-base font-semibold ${notification.read ? 'text-gray-900' : 'text-brand-black'}`}>
                                        {notification.title}
                                    </h3>
                                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                        {notification.timestamp}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                    {notification.message}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {MOCK_NOTIFICATIONS.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No new notifications</p>
                    </div>
                )}
            </div>
        </div>
    );
}
