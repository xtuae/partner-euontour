import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { CheckCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface Agency {
    id: string;
    name: string;
    email: string;
    verification_status: string;
    created_at: string;
}

export function AdminVerifiedAgenciesPage() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const fetchAgencies = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/admin/agencies');
            if (res.ok) {
                const data = await res.json();
                // Filter only verified agencies
                setAgencies(data.agencies.filter((a: Agency) => a.verification_status === 'VERIFIED'));
            } else {
                setError('Failed to fetch agencies');
            }
        } catch (err) {
            setError('Error loading agencies');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete agency: ${name}?`)) return;
        try {
            const res = await apiFetch(`/api/super/agencies/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setAgencies(agencies.filter(a => a.id !== id));
            } else {
                alert('Failed to delete agency');
            }
        } catch (err) {
            alert('Error deleting agency');
        }
    };

    useEffect(() => {
        fetchAgencies();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading verified agencies...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-brand-black">Verified Agencies</h1>
                <Button variant="outline" onClick={fetchAgencies}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            <div className="grid gap-6">
                {agencies.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-gray-500">No verified agencies found.</CardContent></Card>
                ) : (
                    agencies.map((agency) => (
                        <Card key={agency.id}>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                        {agency.name} <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                                    </h3>
                                    <p className="text-sm text-gray-500">{agency.email}</p>
                                    <p className="text-xs text-gray-400 mt-1">Status: {agency.verification_status}</p>
                                    <p className="text-xs text-gray-400">Joined: {new Date(agency.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Link to={`/admin/agencies/${agency.id}`}>
                                        <Button variant="outline">
                                            <ExternalLink className="w-4 h-4 mr-2" /> View Details
                                        </Button>
                                    </Link>
                                    {isSuperAdmin && (
                                        <Button variant="destructive" onClick={() => handleDelete(agency.id, agency.name)}>
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
