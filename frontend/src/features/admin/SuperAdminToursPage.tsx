import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface Tour {
    id: string;
    wp_tour_id: number;
    name: string;
    price: number | string;
    active: boolean;
    image_url: string;
}

export function SuperAdminToursPage() {
    const [tours, setTours] = useState<Tour[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchTours();
    }, []);

    const fetchTours = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/super/tours');
            if (res.ok) {
                const data = await res.json();
                setTours(data.tours || []);
            }
        } catch (error) {
            console.error('Failed to load tours', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await apiFetch('/api/super/tours/sync', {
                method: 'POST'
            });
            if (res.ok) {
                alert('Tours synchronized successfully from WordPress!');
                await fetchTours();
            } else {
                alert('Failed to sync tours');
            }
        } catch (error) {
            console.error('Sync error', error);
            alert('Error syncing tours');
        } finally {
            setSyncing(false);
        }
    };

    const toggleTourStatus = async (tourId: string, currentStatus: boolean) => {
        try {
            const res = await apiFetch(`/api/super/tours/${tourId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ active: !currentStatus })
            });
            if (res.ok) {
                setTours(tours.map(t => t.id === tourId ? { ...t, active: !currentStatus } : t));
            }
        } catch (error) {
            console.error('Toggle status error', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading tours...</div>;

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Global Tours Management</h1>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync with WordPress'}
                </button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tour Inventory ({tours.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-600">ID (WP)</th>
                                    <th className="p-3 font-semibold text-gray-600">Tour Name</th>
                                    <th className="p-3 font-semibold text-gray-600">Price</th>
                                    <th className="p-3 font-semibold text-gray-600">Status</th>
                                    <th className="p-3 font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tours.map((tour) => (
                                    <tr key={tour.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-3 text-sm text-gray-500">{tour.wp_tour_id}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                {tour.image_url && (
                                                    <img src={tour.image_url} alt={tour.name} className="w-10 h-10 object-cover rounded shadow-sm" />
                                                )}
                                                <span className="font-medium text-gray-800">{tour.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 font-medium text-gray-700">€{Number(tour.price).toFixed(2)}</td>
                                        <td className="p-3">
                                            {tour.active ? (
                                                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full w-max">
                                                    <CheckCircle size={14} /> Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full w-max">
                                                    <XCircle size={14} /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => toggleTourStatus(tour.id, tour.active)}
                                                className={`text-sm font-medium ${tour.active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                                            >
                                                {tour.active ? 'Disable' : 'Enable'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {tours.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No tours found. Click "Sync with WordPress" to import tours.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
