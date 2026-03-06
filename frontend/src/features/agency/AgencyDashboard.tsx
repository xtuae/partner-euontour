import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import {
    Wallet,
    MapPin,
    AlertCircle
} from 'lucide-react';
import { Card } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Badge } from '../../app/components/ui/Badge';

export function AgencyDashboard() {
    const [stats, setStats] = useState({
        balance: 0,
        activeBookings: 0,
        verificationStatus: 'NOT_SUBMITTED',
        submissionDate: null as string | null
    });
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [walletRes, statusRes, bookingsRes] = await Promise.all([
                    apiFetch('/api/agency/wallet').then(r => r.json()),
                    apiFetch('/api/agency/verification/status').then(r => r.json()),
                    apiFetch('/api/agency/bookings?limit=5').then(r => r.json())
                ]);

                setStats({
                    balance: walletRes.balance || 0,
                    activeBookings: bookingsRes.count || 0, // In real app, we might filter 'active' specifically
                    verificationStatus: statusRes.status || 'UNVERIFIED',
                    submissionDate: statusRes.submittedAt
                });

                setRecentBookings(bookingsRes.bookings || []);
            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-green-600 bg-green-50';
            case 'REJECTED': return 'text-red-600 bg-red-50';
            case 'UNDER_REVIEW':
            case 'PENDING': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'Verified';
            case 'REJECTED': return 'Rejected';
            case 'UNDER_REVIEW': return 'Pending Review';
            default: return 'Not Submitted';
        }
    };

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
                    <p className="text-2xl font-bold text-gray-900">
                        {stats.balance === undefined ? '€...' : `€${Number(stats.balance || 0).toFixed(2)}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Available for bookings</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-full">
                            <MapPin className="w-4 h-4" />
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeBookings}</p>
                    <p className="text-xs text-gray-400 mt-1">All time bookings</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">Verification Status</h3>
                        <span className={`p-2 rounded-full ${getStatusColor(stats.verificationStatus)}`}>
                            <AlertCircle className="w-4 h-4" />
                        </span>
                    </div>
                    <p className={`text-lg font-bold ${getStatusColor(stats.verificationStatus).split(' ')[0]}`}>
                        {getStatusText(stats.verificationStatus)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {stats.submissionDate ? `Submitted: ${new Date(stats.submissionDate).toLocaleDateString()}` : 'Please submit documents'}
                    </p>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
                    <Button variant="link" size="sm">View all</Button>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading bookings...</div>
                    ) : recentBookings.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No bookings found.</div>
                    ) : (
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
                                {recentBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">#{booking.id.slice(-6).toUpperCase()}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {booking.tour?.name || 'Unknown Tour'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(booking.travel_date || booking.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={booking.status === 'CONFIRMED' ? 'success' : booking.status === 'PENDING' ? 'warning' : 'outline'}>
                                                {booking.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">€{Number(booking.amount).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
}
