import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Link } from 'react-router-dom';
import { BadgeCheck, XCircle, Clock, Trash2, Edit2, Play, Square, Upload } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ProxyKycUploadModal } from './ProxyKycUploadModal';

interface Verification {
    agencyId: string;
    agencyName: string;
    email: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW';
    submittedAt: string;
}

interface Agency {
    id: string;
    name: string;
    email: string;
    type: string;
    status: string;
    created_at: string;
}

export function SuperAdminVerificationList() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [registeredAgencies, setRegisteredAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

    const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
    const [proxyAgency, setProxyAgency] = useState<{ id: string, name: string } | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ companyName: '', ownerName: '', email: '', password: '', phone: '', type: 'Retail' });

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([fetchVerifications(), fetchAgencies()]);
            setLoading(false);
        };
        loadAll();
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
        }
    };

    const fetchAgencies = async () => {
        try {
            const res = await apiFetch('/api/super/agencies');
            if (res.ok) {
                const data = await res.json();
                setRegisteredAgencies(data.agencies || []);
            } else {
                console.error('Failed to fetch agencies:', res.status);
            }
        } catch (error) {
            console.error('Failed to fetch agencies', error);
        }
    };

    const openModal = (mode: 'create' | 'edit', agency?: Agency) => {
        setModalMode(mode);
        if (mode === 'edit' && agency) {
            setSelectedAgencyId(agency.id);
            setFormData({
                companyName: agency.name,
                ownerName: '', // Not strictly needed for edit
                email: agency.email,
                phone: '',
                password: '',
                type: agency.type
            });
        } else {
            setSelectedAgencyId(null);
            setFormData({ companyName: '', ownerName: '', email: '', password: '', phone: '', type: 'Retail' });
        }
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (modalMode === 'create') {
                const res = await apiFetch('/api/super/agencies', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    setIsModalOpen(false);
                    fetchAgencies();
                    alert('Agency created successfully');
                } else {
                    const data = await res.json();
                    alert(data.error || 'Failed to create agency');
                }
            } else if (modalMode === 'edit' && selectedAgencyId) {
                const res = await apiFetch(`/api/super/agencies/${selectedAgencyId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: formData.companyName,
                        email: formData.email,
                        type: formData.type
                    })
                });
                if (res.ok) {
                    setIsModalOpen(false);
                    fetchAgencies();
                    alert('Agency updated successfully');
                } else {
                    const data = await res.json();
                    alert(data.error || 'Failed to update agency');
                }
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        if (!confirm(`Are you sure you want to change this agency's status to ${newStatus}?`)) return;

        try {
            const res = await apiFetch(`/api/super/agencies/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchAgencies();
            } else {
                alert('Failed to change agency status');
            }
        } catch (err) {
            alert('Error toggling status');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete agency: ${name}?`)) return;
        try {
            const res = await apiFetch(`/api/super/agencies/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAgencies();
            } else {
                alert('Failed to delete agency');
            }
        } catch (err) {
            alert('Error deleting agency');
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
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-red to-red-600 !bg-clip-text text-transparent">Agencies & KYC Master Control</h1>
                {isSuperAdmin && (
                    <Button onClick={() => openModal('create')} className="bg-brand-red hover:bg-red-700 font-semibold shadow-md hover:shadow-lg transition-all">
                        + Create Agency
                    </Button>
                )}
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

            <Card className="border-t-4 border-t-blue-500 shadow-md">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                    <CardTitle className="text-blue-900 flex items-center gap-2">Registered Agencies <span className="text-sm font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{registeredAgencies.length}</span></CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-gray-50/80 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-700">Agency Details</th>
                                    <th className="p-4 font-semibold text-gray-700">Type</th>
                                    <th className="p-4 font-semibold text-gray-700">System Status</th>
                                    <th className="p-4 font-semibold text-gray-700">Joined Date</th>
                                    <th className="p-4 font-semibold text-gray-700 text-right">Administrative Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {registeredAgencies.map((agency) => (
                                    <tr key={agency.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900">{agency.name}</div>
                                            <div className="text-sm text-gray-500">{agency.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200">{agency.type}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${agency.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                                                {agency.status || 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(agency.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openModal('edit', agency)} className="bg-white hover:bg-gray-50 w-8 h-8 p-0" title="Edit Agency">
                                                    <Edit2 size={14} className="text-gray-600" />
                                                </Button>
                                                {isSuperAdmin && (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => { setProxyAgency({ id: agency.id, name: agency.name }); setIsProxyModalOpen(true); }} className="bg-white hover:bg-blue-50 border-blue-200 w-8 h-8 p-0" title="Upload Proxy KYC">
                                                            <Upload size={14} className="text-brand-blue" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={`w-8 h-8 p-0 bg-white ${agency.status === 'ACTIVE' ? 'hover:bg-orange-50 hover:border-orange-200' : 'hover:bg-green-50 hover:border-green-200'}`}
                                                            onClick={() => handleToggleStatus(agency.id, agency.status || 'ACTIVE')}
                                                            title={agency.status === 'ACTIVE' ? 'Suspend Agency' : 'Activate Agency'}
                                                        >
                                                            {agency.status === 'ACTIVE' ? <Square size={14} className="text-orange-500" /> : <Play size={14} className="text-green-600" />}
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleDelete(agency.id, agency.name)} className="w-8 h-8 p-0 bg-white hover:bg-red-50 hover:border-red-200" title="Delete Agency">
                                                            <Trash2 size={14} className="text-red-500" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {registeredAgencies.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500 bg-gray-50/50">No registered agencies found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">{modalMode === 'create' ? 'Create New Agency' : 'Edit Agency'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-5">
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

                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="px-6">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="px-6 bg-brand-red hover:bg-red-700 shadow-md">
                                    {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Agency' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isProxyModalOpen && proxyAgency && (
                <ProxyKycUploadModal
                    agencyId={proxyAgency.id}
                    agencyName={proxyAgency.name}
                    onClose={() => setIsProxyModalOpen(false)}
                    onSuccess={() => {
                        setIsProxyModalOpen(false);
                        fetchVerifications();
                    }}
                />
            )}
        </div>
    );
}
