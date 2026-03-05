import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Link } from 'react-router-dom';
import { BadgeCheck, XCircle, Clock } from 'lucide-react';

interface Verification {
    agencyId: string;
    agencyName: string;
    email: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW';
    submittedAt: string;
}

export function SuperAdminVerificationList() {
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ companyName: '', ownerName: '', email: '', password: '', phone: '', type: 'Retail' });

    useEffect(() => {
        fetchVerifications();
    }, []);

    const fetchVerifications = async () => {
        try {
            // FIX 1: Point to the correct Admin endpoint (which handles verifications)
            const res = await apiFetch('/api/admin/agency-verifications');

            if (res.ok) {
                const data = await res.json();

                // FIX 2 & 3: Extract the array and map the nested Prisma data to the flat interface
                const rawList = data.verifications || [];
                const mappedList = rawList.map((item: any) => ({
                    agencyId: item.agencyId,
                    // Handle case where agency relation might be missing (though it shouldn't be)
                    agencyName: item.agency?.name || 'Unknown Agency',
                    email: item.agency?.email || 'No Email',
                    status: item.status,
                    submittedAt: item.createdAt
                }));

                setVerifications(mappedList);
            } else {
                console.error('API Error:', res.status);
            }
        } catch (error) {
            console.error('Failed to fetch', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAgency = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await apiFetch('/api/super/agencies', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                setFormData({ companyName: '', ownerName: '', email: '', password: '', phone: '', type: 'Retail' });
                fetchVerifications();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create agency');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'VERIFIED': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1"><BadgeCheck size={12} /> Verified</span>;
            case 'REJECTED': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center gap-1"><XCircle size={12} /> Rejected</span>;
            default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center gap-1"><Clock size={12} /> Pending</span>;
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Agency Verifications & Staff</h1>
                <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center">
                    Create Agency
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Verification Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3">Agency Name</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Submitted</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {verifications.map((v) => (
                                    <tr key={v.agencyId} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{v.agencyName}</td>
                                        <td className="p-3 text-gray-500">{v.email}</td>
                                        <td className="p-3">{getStatusBadge(v.status)}</td>
                                        <td className="p-3 text-sm text-gray-500">{new Date(v.submittedAt).toLocaleDateString()}</td>
                                        <td className="p-3">
                                            <Link
                                                to={`/super-admin/agency-verifications/${v.agencyId}`}
                                                className="text-brand-blue hover:underline text-sm font-medium"
                                            >
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {verifications.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">No verifications found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Create New Agency</h2>
                        <form onSubmit={handleCreateAgency} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Agency / Company Name</label>
                                <input required type="text" className="mt-1 w-full border p-2 rounded" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Primary Owner Name</label>
                                <input required type="text" className="mt-1 w-full border p-2 rounded" value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Login Email Address</label>
                                <input required type="email" className="mt-1 w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Secure Password</label>
                                <input required type="password" minLength={6} className="mt-1 w-full border p-2 rounded" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contact Phone (Optional)</label>
                                <input type="tel" className="mt-1 w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Agency Type</label>
                                <select className="mt-1 w-full border p-2 rounded" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="Retail">Retail</option>
                                    <option value="B2B">B2B Wholesale</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                                <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Agency & User'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
