import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { RefreshCw, CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface Deposit {
    id: string;
    agency_id: string;
    agency: { name: string; email: string };
    amount: number;
    created_at: string;
    status: string;
    proof_url?: string;
}

export function AdminDepositsPage() {
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchDeposits = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/admin/deposits');
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

    const handleApprove = async (id: string, agencyName: string, amount: number) => {
        if (!confirm(`Are you sure you want to approve this deposit of AED ${amount} for ${agencyName}? This will credit their wallet instantly.`)) return;

        try {
            const res = await apiFetch(`/api/admin/deposits/${id}/approve`, { method: 'POST' });
            if (res.ok) {
                alert('Deposit approved successfully.');
                fetchDeposits();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to approve deposit.');
            }
        } catch (err) {
            alert('Error approving deposit.');
        }
    };

    const openRejectModal = (id: string) => {
        setSelectedDepositId(id);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    const handleReject = async () => {
        if (!selectedDepositId) return;
        if (!rejectionReason.trim()) return alert('Please enter a rejection reason.');

        setSubmitting(true);
        try {
            const res = await apiFetch(`/api/admin/deposits/${selectedDepositId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ rejectionReason })
            });
            if (res.ok) {
                alert('Deposit rejected.');
                setRejectModalOpen(false);
                fetchDeposits();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to reject deposit.');
            }
        } catch (err) {
            alert('Error rejecting deposit.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && deposits.length === 0) return <div className="p-8 text-center text-gray-500">Loading deposits...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6 flex flex-col min-h-full">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-brand-black">Manage Deposits</h1>
                <Button variant="outline" onClick={fetchDeposits}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4 flex items-center"><AlertCircle className="w-5 h-5 mr-2" />{error}</div>}

            <Card className="overflow-hidden flex-1">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Agency</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Receipt</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deposits.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No pending deposits require review.</td></tr>
                                ) : (
                                    deposits.map((dep) => (
                                        <tr key={dep.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(dep.created_at).toLocaleDateString()}
                                                <div className="text-xs text-gray-400">{new Date(dep.created_at).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{dep.agency?.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{dep.agency?.email || dep.agency_id.substring(0, 8)}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                AED {dep.amount}
                                            </td>
                                            <td className="px-6 py-4">
                                                {dep.proof_url ? (
                                                    <a href={dep.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-brand-blue bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors">
                                                        <Eye className="w-3.5 h-3.5 mr-1.5" /> View Receipt
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">No Receipt</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleApprove(dep.id, dep.agency?.name || 'Unknown', dep.amount)}>
                                                        <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => openRejectModal(dep.id)}>
                                                        <XCircle className="w-4 h-4 mr-1.5" /> Reject
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {rejectModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <XCircle className="w-5 h-5 text-red-500 mr-2" /> Reject Deposit
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Please provide a reason for rejecting this deposit. This will be emailed to the agency.
                        </p>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow mb-4"
                            rows={3}
                            placeholder="e.g. Blurry receipt, transfer not received..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setRejectModalOpen(false)} disabled={submitting}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={submitting}>
                                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
