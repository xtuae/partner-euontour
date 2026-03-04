import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { CreditCard, AlertTriangle, Activity } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

export function AdminDashboard() {
    const [stats, setStats] = useState({
        totalWalletBalance: 0,
        pendingAdminDeposits: 0,
        pendingSuperAdminDeposits: 0,
        totalCredits30d: 0,
        totalDebits30d: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiFetch('/api/admin/finance/metrics');
                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        totalWalletBalance: Number(data.totalWalletBalance) || 0,
                        pendingAdminDeposits: data.pendingAdminDeposits || 0,
                        pendingSuperAdminDeposits: data.pendingSuperAdminDeposits || 0,
                        totalCredits30d: Number(data.totalCredits30d) || 0,
                        totalDebits30d: Number(data.totalDebits30d) || 0
                    });
                } else {
                    console.error("Failed to fetch admin stats");
                }
            } catch (error) {
                console.error("Error fetching admin stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard stats...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-brand-black mb-6">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6 flex items-center space-x-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Wallet Balance</p>
                            <h3 className="text-2xl font-bold">€{stats.totalWalletBalance.toFixed(2)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center space-x-4">
                        <div className="bg-yellow-100 p-3 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending Super Deposits</p>
                            <h3 className="text-2xl font-bold">{stats.pendingSuperAdminDeposits}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center space-x-4">
                        <div className="bg-green-100 p-3 rounded-full">
                            <Activity className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">30d Credits</p>
                            <h3 className="text-2xl font-bold">€{stats.totalCredits30d.toFixed(2)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center space-x-4">
                        <div className="bg-red-100 p-3 rounded-full">
                            <Activity className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">30d Debits</p>
                            <h3 className="text-2xl font-bold">€{stats.totalDebits30d.toFixed(2)}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500">Activity logs will appear here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
