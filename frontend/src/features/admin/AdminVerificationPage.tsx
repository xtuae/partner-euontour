import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { CheckCircle, XCircle, FileText, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface Agency {
    id: string;
    name: string;
    email: string;
    verification_status: string;
    created_at: string;
}

export function AdminVerificationPage() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAgencies = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/admin/agencies/get');
            if (res.ok) {
                const data = await res.json();
                // Filter for unverified on client side if API returns all, or better if API filters
                // Assuming API returns key 'agencies'
                setAgencies(data.agencies.filter((a: Agency) => a.verification_status !== 'VERIFIED' && a.verification_status !== 'REJECTED'));
            } else {
                setError('Failed to fetch agencies');
            }
        } catch (err) {
            setError('Error loading agencies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgencies();
    }, []);

    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this agency?`)) return;

        try {
            const res = await apiFetch('/api/admin/agency/verify', {
                method: 'POST',
                body: JSON.stringify({ agencyId: id, action }),
            });

            if (res.ok) {
                alert(`Agency ${action}D successfully`);
                fetchAgencies(); // Refresh list
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Error: ${errData.error || 'Action failed'}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message || 'Error performing action'}`);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading verification queue...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-brand-black">Agency Verification</h1>
                <Button variant="outline" onClick={fetchAgencies}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            <div className="grid gap-6">
                {agencies.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-gray-500">No agencies pending verification.</CardContent></Card>
                ) : (
                    agencies.map((agency) => (
                        <Card key={agency.id}>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{agency.name}</h3>
                                    <p className="text-sm text-gray-500">{agency.email}</p>
                                    <p className="text-xs text-gray-400 mt-1">Status: {agency.verification_status}</p>
                                    <p className="text-xs text-gray-400">Submitted: {new Date(agency.created_at).toLocaleDateString()}</p>
                                    <div className="mt-2 flex items-center text-sm text-blue-600 cursor-pointer hover:underline">
                                        <FileText className="w-4 h-4 mr-1" /> View Documents (Placeholder)
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(agency.id, 'APPROVE')}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Verify
                                    </Button>
                                    <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleAction(agency.id, 'REJECT')}>
                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
