import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { apiFetch } from '../../lib/api-client';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface KPIs {
    totalRevenue: number;
    totalLiabilities: number;
    bookingCount: number;
    pendingDepositsCount: number;
}

interface RevenueData {
    date: string;
    revenue: number;
    count: number;
}

interface TopAgency {
    id: string;
    name: string;
    spent: number;
}

interface TopTour {
    id: string;
    name: string;
    bookings: number;
}

export function AnalyticsDashboard() {
    const [kpis, setKpis] = useState<KPIs | null>(null);
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [topAgencies, setTopAgencies] = useState<TopAgency[]>([]);
    const [topTours, setTopTours] = useState<TopTour[]>([]);

    const [loadingKpis, setLoadingKpis] = useState(true);
    const [loadingRevenue, setLoadingRevenue] = useState(true);
    const [loadingTop, setLoadingTop] = useState(true);

    useEffect(() => {
        // Fetch KPIs
        apiFetch('/api/analytics/kpis')
            .then(res => res.json())
            .then(data => {
                setKpis(data);
                setLoadingKpis(false);
            })
            .catch(console.error);

        // Fetch Revenue Over Time
        apiFetch('/api/analytics/revenue')
            .then(res => res.json())
            .then(data => {
                setRevenueData(data.revenueOverTime);
                setLoadingRevenue(false);
            })
            .catch(console.error);

        // Fetch Top Performers
        apiFetch('/api/analytics/top-performers')
            .then(res => res.json())
            .then(data => {
                setTopAgencies(data.topAgencies);
                setTopTours(data.topTours);
                setLoadingTop(false);
            })
            .catch(console.error);
    }, []);

    const formatCurrency = (value: number) => `€${value.toFixed(2)}`;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
                <p className="text-gray-500 mt-1">Super Admin dashboard measuring cash flow, liabilities, and agency performance.</p>
            </div>

            {/* Top Row: KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-gray-200">
                    <CardContent className="p-6">
                        <div className="text-sm font-medium text-gray-500 mb-1">Total Revenue</div>
                        {loadingKpis ? (
                            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis?.totalRevenue || 0)}</div>
                        )}
                        <div className="text-xs text-green-600 mt-2">All Confirmed Bookings</div>
                    </CardContent>
                </Card>

                <Card className="border-gray-200">
                    <CardContent className="p-6">
                        <div className="text-sm font-medium text-gray-500 mb-1">Total Liabilities</div>
                        {loadingKpis ? (
                            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis?.totalLiabilities || 0)}</div>
                        )}
                        <div className="text-xs text-orange-600 mt-2">Circulating Wallet Balance</div>
                    </CardContent>
                </Card>

                <Card className="border-gray-200">
                    <CardContent className="p-6">
                        <div className="text-sm font-medium text-gray-500 mb-1">Confirmed Bookings</div>
                        {loadingKpis ? (
                            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                            <div className="text-2xl font-bold text-gray-900">{kpis?.bookingCount || 0}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">Lifetime total</div>
                    </CardContent>
                </Card>

                <Card className="border-gray-200">
                    <CardContent className="p-6">
                        <div className="text-sm font-medium text-gray-500 mb-1">Pending Deposits</div>
                        {loadingKpis ? (
                            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                            <div className="text-2xl font-bold text-gray-900">{kpis?.pendingDepositsCount || 0}</div>
                        )}
                        <div className="text-xs text-blue-600 mt-2">Requires review</div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Revenue Over Time */}
            <Card className="border-gray-200">
                <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue (Last 30 Days)</h2>
                    {loadingRevenue ? (
                        <div className="h-80 w-full bg-gray-50 animate-pulse rounded-lg border border-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 font-mono text-sm">Aggregating timeline...</span>
                        </div>
                    ) : (
                        <div className="w-full h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(tick) => {
                                            const d = new Date(tick);
                                            return `${d.getDate()}/${d.getMonth() + 1}`;
                                        }}
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        tickMargin={10}
                                    />
                                    <YAxis
                                        tickFormatter={(tick) => `€${tick}`}
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`€${Number(value).toFixed(2)}`, 'Revenue']}
                                        labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#2563EB"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bottom Row: Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-gray-200">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Top 5 Agencies (Spend)</h2>
                        {loadingTop ? (
                            <div className="h-64 w-full bg-gray-50 animate-pulse rounded-lg flex items-center justify-center">
                                <span className="text-gray-400 font-mono text-sm">Ranking agencies...</span>
                            </div>
                        ) : (
                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topAgencies} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                        <XAxis type="number" tickFormatter={(tick) => `€${tick}`} stroke="#9CA3AF" fontSize={12} />
                                        <YAxis dataKey="name" type="category" width={100} stroke="#9CA3AF" fontSize={12} tick={{ fill: '#4B5563' }} />
                                        <Tooltip
                                            formatter={(value: any) => [`€${Number(value).toFixed(2)}`, 'Spent']}
                                            cursor={{ fill: '#F3F4F6' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="spent" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-gray-200">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Top 5 Tours (Volume)</h2>
                        {loadingTop ? (
                            <div className="h-64 w-full bg-gray-50 animate-pulse rounded-lg flex items-center justify-center">
                                <span className="text-gray-400 font-mono text-sm">Ranking tours...</span>
                            </div>
                        ) : (
                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topTours} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" width={100} stroke="#9CA3AF" fontSize={12} tick={{ fill: '#4B5563' }} />
                                        <Tooltip
                                            formatter={(value: any) => [value, 'Bookings']}
                                            cursor={{ fill: '#F3F4F6' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="bookings" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
