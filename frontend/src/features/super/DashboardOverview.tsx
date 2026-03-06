import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Activity, CreditCard, DollarSign, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
    liabilities: number;
    revenue: number;
    pendingDeposits: number;
    activeAgencies: number;
    topAgencies: { agencyName: string; revenue: number }[];
    recentBookings: {
        id: string;
        agency: string;
        tour: string;
        amount: number;
        date: string;
        status: string;
    }[];
}

export function DashboardOverview() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await apiFetch('/api/super/analytics');
                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                }
            } catch (err) {
                console.error('Failed to fetch analytics', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading || !data) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Aggregating Global Financials...</div>;
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Financial Overview</h1>
                    <p className="text-gray-500 mt-1">Global platform metrics and agency liabilities.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-t-4 border-t-brand-blue shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Valid Revenue</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">AED {(data.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="p-3 bg-blue-50 text-brand-blue rounded-full">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Agency Liabilities (Wallets)</p>
                                <h3 className="text-2xl font-bold text-red-600 mt-1">AED {(data.liabilities).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="p-3 bg-red-50 text-red-500 rounded-full">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Pending Deposits</p>
                                <h3 className="text-2xl font-bold text-amber-600 mt-1">{data.pendingDeposits} Requests</h3>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                                <CreditCard className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Active Agencies</p>
                                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{data.activeAgencies} Partners</h3>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Tables Container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recharts Bar Graph */}
                <Card className="shadow-sm border border-gray-100 flex flex-col">
                    <div className="p-6 border-b border-gray-50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Activity className="w-5 h-5 text-gray-500" /> Top Agency Volume</h3>
                    </div>
                    <CardContent className="p-6 flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topAgencies} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="agencyName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `AED ${value}`} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Recent Activity Table */}
                <Card className="shadow-sm border border-gray-100 flex flex-col">
                    <div className="p-6 border-b border-gray-50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Activity className="w-5 h-5 text-gray-500" /> Recent Global Network Activity</h3>
                    </div>
                    <CardContent className="p-0 flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Agency</th>
                                    <th className="px-6 py-3 font-semibold">Tour Reserved</th>
                                    <th className="px-6 py-3 font-semibold text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.recentBookings.length === 0 ? (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No recent platform bookings.</td></tr>
                                ) : (
                                    data.recentBookings.map((b) => (
                                        <tr key={b.id} className="bg-white hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-900 block">{b.agency}</span>
                                                <span className="text-xs text-gray-400">{new Date(b.date).toLocaleTimeString()} - {new Date(b.date).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-700 truncate max-w-[200px]">{b.tour}</td>
                                            <td className="px-6 py-4 text-right font-bold text-brand-black">AED {Number(b.amount).toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
