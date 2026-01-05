import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Check, X, ArrowLeft, ExternalLink } from 'lucide-react';

interface Detail {
    agency: { name: string; email: string; type: string };
    verification: { status: string; documents: any[]; submittedAt: string };
}

export function SuperAdminVerificationDetail() {
    const { agencyId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<Detail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    useEffect(() => {
        fetchDetail();
    }, [agencyId]);

    const fetchDetail = async () => {
        try {
            const res = await apiFetch(`/api/super/agency-verifications/${agencyId}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this agency? Booking will be unlocked immediately.')) return;
        setActionLoading(true);
        try {
            const res = await apiFetch(`/api/super/agency-verifications/${agencyId}/approve`, {
                method: 'PUT'
            });
            if (res.ok) {
                alert('Agency Verified Successfully');
                navigate('/super-admin/agency-verifications');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason) return alert('Reason is required');
        setActionLoading(true);
        try {
            const res = await apiFetch(`/api/super/agency-verifications/${agencyId}/reject`, {
                method: 'PUT',
                body: JSON.stringify({ reason: rejectReason })
            });
            if (res.ok) {
                alert('Agency Rejected');
                navigate('/super-admin/agency-verifications');
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>Not Found</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button onClick={() => navigate('/super-admin/agency-verifications')} className="mb-4 text-gray-500 hover:text-black flex items-center gap-1">
                <ArrowLeft size={16} /> Back to List
            </button>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{data.agency.name}</h1>
                    <p className="text-gray-500">{data.agency.email} • {data.agency.type}</p>
                </div>
                <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${data.verification.status === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {data.verification.status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                    <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.verification.documents.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                                    <span className="capitalize font-medium text-sm">{doc.type.replace('_', ' ')}</span>
                                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-brand-blue flex items-center gap-1 text-sm hover:underline">
                                        View <ExternalLink size={14} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                    <CardContent>
                        {data.verification.status !== 'VERIFIED' && (
                            <div className="space-y-4">
                                <button
                                    onClick={handleApprove}
                                    disabled={actionLoading}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> Approve Verification
                                </button>

                                {!showRejectForm ? (
                                    <button
                                        onClick={() => setShowRejectForm(true)}
                                        disabled={actionLoading}
                                        className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 px-4 rounded flex items-center justify-center gap-2"
                                    >
                                        <X size={18} /> Reject
                                    </button>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded border border-red-100">
                                        <label className="block text-sm font-medium text-red-800 mb-1">Reason for Rejection</label>
                                        <textarea
                                            className="w-full p-2 border rounded text-sm mb-2"
                                            rows={2}
                                            value={rejectReason}
                                            onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Missing documents..."
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleReject} disabled={actionLoading} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Confirm Reject</button>
                                            <button onClick={() => setShowRejectForm(false)} className="text-gray-500 px-3 py-1 text-sm">Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {data.verification.status === 'VERIFIED' && (
                            <p className="text-gray-500 text-center italic">This agency is verified.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
