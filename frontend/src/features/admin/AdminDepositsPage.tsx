import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { RefreshCw, CheckCircle, XCircle, Eye, AlertCircle, Download } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { ImageModal } from '../../app/components/ui/ImageModal';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';
import { toast } from 'react-hot-toast';

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
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

    const [approveTarget, setApproveTarget] = useState<{ id: string; agencyName: string; amount: number } | null>(null);
    const [approving, setApproving] = useState(false);

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

    const handleApprove = (id: string, agencyName: string, amount: number) => {
        setApproveTarget({ id, agencyName, amount });
    };

    const confirmApprove = async () => {
        if (!approveTarget) return;
        setApproving(true);
        try {
            const res = await apiFetch(`/api/admin/deposits/${approveTarget.id}/approve`, { method: 'POST' });
            if (res.ok) {
                toast.success('Deposit approved successfully.');
                fetchDeposits();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to approve deposit.');
            }
        } catch (err) {
            toast.error('Error approving deposit.');
        } finally {
            setApproving(false);
            setApproveTarget(null);
        }
    };

    const openRejectModal = (id: string) => {
        setSelectedDepositId(id);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    const handleReject = async () => {
        if (!selectedDepositId) return;
        if (!rejectionReason.trim()) {
            toast.error('Please enter a rejection reason.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch(`/api/admin/deposits/${selectedDepositId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ rejectionReason })
            });
            if (res.ok) {
                toast.success('Deposit rejected.');
                setRejectModalOpen(false);
                fetchDeposits();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to reject deposit.');
            }
        } catch (err) {
            toast.error('Error rejecting deposit.');
        } finally {
            setSubmitting(false);
        }
    };

    const getExportData = () => {
        return deposits.map(dep => ({
            ID: dep.id.slice(0, 8),
            'Agency Name': dep.agency?.name || 'Unknown',
            'Agency Email': dep.agency?.email || 'N/A',
            Amount: `€${dep.amount}`,
            Date: new Date(dep.created_at).toLocaleDateString(),
            Status: dep.status
        }));
    };

    const handleExportCSV = () => {
        exportToCSV(getExportData(), 'agency_deposits');
    };

    const handleExportPDF = () => {
        const data = getExportData();
        const columns = ['ID', 'Agency Name', 'Agency Email', 'Amount', 'Date', 'Status'];
        exportToPDF(data, columns, 'agency_deposits', 'Agency Deposits');
    };

    if (loading && deposits.length === 0) return <div className="p-8 text-center text-gray-500">Loading deposits...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6 flex flex-col min-h-full">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-brand-black">Manage Deposits</h1>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                    </Button>
                    <Button variant="outline" onClick={fetchDeposits}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
                </div>
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
                                                €{dep.amount}
                                            </td>
                                            <td className="px-6 py-4">
                                                {dep.proof_url ? (
                                                    <button onClick={() => setSelectedReceipt(dep.proof_url!)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-brand-blue bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors">
                                                        <Eye className="w-3.5 h-3.5 mr-1.5" /> View Receipt
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No receipt</span>
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

            {approveTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" /> Approve Deposit
                        </h2>
                        <p className="text-sm text-gray-600 mb-6 font-medium">
                            Are you sure you want to approve this deposit of €{approveTarget.amount} for {approveTarget.agencyName}?
                            This will credit their wallet instantly.
                        </p>
                        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={approving}>Cancel</Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={confirmApprove} disabled={approving}>
                                {approving ? 'Processing...' : 'Confirm Approval'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ImageModal
                isOpen={!!selectedReceipt}
                imageUrl={selectedReceipt}
                altText="Deposit Receipt"
                onClose={() => setSelectedReceipt(null)}
            />
        </div>
    );
}
