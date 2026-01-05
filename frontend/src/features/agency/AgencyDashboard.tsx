import { useState, useEffect } from 'react';
import {
    Wallet,
    MapPin,
    AlertCircle
} from 'lucide-react';
import { Card } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Badge } from '../../app/components/ui/Badge';

export function AgencyDashboard() {
    const [balance, setBalance] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/wallet/balance')
            .then(res => res.json())
            .then(data => setBalance(Number(data.balance)))
            .catch(console.error);
    }, []);

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-500">Overview of your agency performance.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" size="sm">
                        Add Funds
                    </Button>
                    <Button variant="primary" size="sm">
                        New Booking
                    </Button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">Wallet Balance</h3>
                        <span className="p-2 bg-green-50 text-green-600 rounded-full">
                            <Wallet className="w-4 h-4" />
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">€{(balance || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">Available for bookings</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">Active Bookings</h3>
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-full">
                            <MapPin className="w-4 h-4" />
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                    <p className="text-xs text-gray-400 mt-1">Upcoming trips</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">Verification Status</h3>
                        <span className="p-2 bg-yellow-50 text-yellow-600 rounded-full">
                            <AlertCircle className="w-4 h-4" />
                        </span>
                    </div>
                    <p className="text-lg font-bold text-yellow-600">Pending Review</p>
                    <p className="text-xs text-gray-400 mt-1">Documents submitted</p>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
                    <Button variant="link" size="sm">View all</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Booking ID</th>
                                <th className="px-6 py-3">Destination</th>
                                <th className="px-6 py-3">Travel Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 text-gray-900 font-medium">#BK-7829</td>
                                <td className="px-6 py-4 text-gray-600">Paris, France</td>
                                <td className="px-6 py-4 text-gray-600">Oct 24, 2026</td>
                                <td className="px-6 py-4">
                                    <Badge variant="success">Confirmed</Badge>
                                </td>
                                <td className="px-6 py-4 text-gray-900 font-medium">€1,299.00</td>
                            </tr>
                            <tr className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 text-gray-900 font-medium">#BK-7830</td>
                                <td className="px-6 py-4 text-gray-600">Rome, Italy</td>
                                <td className="px-6 py-4 text-gray-600">Nov 12, 2026</td>
                                <td className="px-6 py-4">
                                    <Badge variant="warning">Pending</Badge>
                                </td>
                                <td className="px-6 py-4 text-gray-900 font-medium">€850.00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
