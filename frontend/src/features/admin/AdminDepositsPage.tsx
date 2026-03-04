import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface Deposit {
    id: string;
    agency_id: string;
    amount: number;
    created_at: string;
    status: string;
    proof_url?: string;
}

export function AdminDepositsPage() {
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDeposits = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/admin/deposits/list');
            if (res.ok) {
                const data = await res.json();
                setDeposits(data.deposits);
            } else {
                setError('Failed to fetch deposits');
            }
        } catch (err) {
            setError('Error loading deposits');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeposits();
    }, []);

    const handleAction = async (id: string, action: 'VERIFY' | 'APPROVE') => {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this deposit?`)) return;

        try {
            const url = `/api/deposits/${id}/${action.toLowerCase()}`;
            const res = await apiFetch(url, {
                method: 'PUT',
            });

            if (res.ok) {
                alert(`Deposit ${action}ED successfully`);
                fetchDeposits();
            } else {
                alert('Action failed');
            }
        } catch (err) {
            alert('Error performing action');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading deposits...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-brand-black">Manage Deposits</h1>
                <Button variant="outline" onClick={fetchDeposits}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">ID / Agency</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deposits.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center">No pending deposits found.</td></tr>
                            ) : (
                                deposits.map((dep) => (
                                    <tr key={dep.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {dep.id.substring(0, 8)}...
                                            <div className="text-xs text-gray-400">{dep.agency_id}</div>
                                        </td>
                                        <td className="px-6 py-4">€{dep.amount}</td>
                                        <td className="px-6 py-4">{new Date(dep.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dep.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                dep.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {dep.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 space-x-2">
                                            {dep.status === 'PENDING_ADMIN' && (
                                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => handleAction(dep.id, 'VERIFY')}>
                                                    <CheckCircle className="w-4 h-4 mr-1" /> Verify
                                                </Button>
                                            )}
                                            {dep.status === 'PENDING_SUPER_ADMIN' && (
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(dep.id, 'APPROVE')}>
                                                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
