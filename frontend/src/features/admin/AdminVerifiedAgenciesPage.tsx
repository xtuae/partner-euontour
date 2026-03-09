import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { CheckCircle, ExternalLink, RefreshCw, Trash2, Bell, Download } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';

interface Agency {
    id: string;
    name: string;
    email: string;
    verification_status: string;
    created_at: string;
    wallet_balance?: string | number;
    status?: string;
}

export function AdminVerifiedAgenciesPage() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        companyName: '',
        ownerName: '',
        email: '',
        phone: '',
        password: '',
        type: 'Retail'
    });
    const [formLoading, setFormLoading] = useState(false);

    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const fetchAgencies = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/super/agencies'); // Super admin endpoint
            if (res.ok) {
                const data = await res.json();
                setAgencies(data.agencies || []);
            } else {
                setError('Failed to fetch agencies');
            }
        } catch (err) {
            setError('Error loading agencies');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (mode: 'create' | 'edit', agency?: Agency) => {
        setModalMode(mode);
        if (mode === 'edit' && agency) {
            setSelectedAgency(agency);
            setFormData({
                companyName: agency.name,
                ownerName: '', // Not returned by default in the list, fine to ignore or just leave blank for update
                email: agency.email,
                phone: '',
                password: '',
                type: 'Retail' // Assuming default or mapping if it exists
            });
        } else {
            setSelectedAgency(null);
            setFormData({ companyName: '', ownerName: '', email: '', phone: '', password: '', type: 'Retail' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            if (modalMode === 'create') {
                const res = await apiFetch('/api/super/agencies', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    alert('Agency created successfully!');
                    handleCloseModal();
                    fetchAgencies();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Failed to create agency');
                }
            } else if (modalMode === 'edit' && selectedAgency) {
                const res = await apiFetch(`/api/super/agencies/${selectedAgency.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: formData.companyName,
                        email: formData.email,
                        type: formData.type
                    })
                });
                if (res.ok) {
                    alert('Agency updated successfully!');
                    handleCloseModal();
                    fetchAgencies();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Failed to update agency');
                }
            }
        } catch (err) {
            console.error('Submit Error:', err);
            alert('An error occurred. Please try again.');
        } finally {
            setFormLoading(false);
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
                setAgencies(agencies.filter(a => a.id !== id));
            } else {
                alert('Failed to delete agency');
            }
        } catch (err) {
            alert('Error deleting agency');
        }
    };

    const handleSendReminder = async (id: string) => {
        if (!confirm('Send a KYC reminder email to this agency?')) return;
        try {
            const res = await apiFetch(`/api/admin/agencies/${id}/kyc-reminder`, { method: 'POST' });
            if (res.ok) {
                alert('KYC Reminder sent successfully!');
            } else {
                alert('Failed to send reminder.');
            }
        } catch (err) {
            alert('Error sending reminder.');
        }
    };

    useEffect(() => {
        fetchAgencies();
    }, []);

    const getExportData = () => {
        return agencies.map(agency => ({
            'Agency Name': agency.name,
            Email: agency.email,
            'KYC Status': agency.verification_status,
            'Wallet Balance': agency.wallet_balance !== undefined ? `€${Number(agency.wallet_balance).toFixed(2)}` : '€0.00'
        }));
    };

    const handleExportCSV = () => {
        exportToCSV(getExportData(), 'agency_list');
    };

    const handleExportPDF = () => {
        const data = getExportData();
        const columns = ['Agency Name', 'Email', 'KYC Status', 'Wallet Balance'];
        exportToPDF(data, columns, 'agency_list', 'Verified Agencies Platform Liability');
    };

    if (loading) return <div className="p-8 text-center">Loading agencies...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-brand-black">Agency Management</h1>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                    </Button>
                    <Button variant="outline" onClick={fetchAgencies}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
                    {isSuperAdmin && (
                        <Button onClick={() => handleOpenModal('create')} className="bg-brand-red text-white hover:bg-red-700">
                            + Create Agency
                        </Button>
                    )}
                </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            <div className="grid gap-6">
                {agencies.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-gray-500">No agencies found.</CardContent></Card>
                ) : (
                    agencies.map((agency) => (
                        <Card key={agency.id} className="border-l-4 border-l-brand-red">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                        {agency.name} {agency.verification_status === 'VERIFIED' && <CheckCircle className="w-4 h-4 text-green-500 ml-2" />}
                                    </h3>
                                    <p className="text-sm text-gray-500">{agency.email}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${agency.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            Verification: {agency.verification_status}
                                        </span>
                                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${(agency as any).status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                            Status: {(agency as any).status || 'ACTIVE'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Joined: {new Date(agency.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Link to={`/admin/agencies/${agency.id}`}>
                                        <Button variant="outline" size="sm">
                                            <ExternalLink className="w-4 h-4 mr-2" /> View Details
                                        </Button>
                                    </Link>
                                    <Button variant="outline" size="sm" onClick={() => handleSendReminder(agency.id)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                        <Bell className="w-4 h-4 mr-2" /> Reminder
                                    </Button>
                                    {isSuperAdmin && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => handleOpenModal('edit', agency)}>
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={(agency as any).status === 'ACTIVE' ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                                                onClick={() => handleToggleStatus(agency.id, (agency as any).status || 'ACTIVE')}
                                            >
                                                {(agency as any).status === 'ACTIVE' ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(agency.id, agency.name)}>
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold mb-4">{modalMode === 'create' ? 'Create New Agency' : 'Edit Agency'}</h2>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border rounded-md"
                                    value={formData.companyName}
                                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                />
                            </div>

                            {modalMode === 'create' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border rounded-md"
                                        value={formData.ownerName}
                                        onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full p-2 border rounded-md"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {modalMode === 'create' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                                        <input
                                            type="tel"
                                            className="w-full p-2 border rounded-md"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            className="w-full p-2 border rounded-md"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Type</label>
                                <select
                                    className="w-full p-2 border rounded-md bg-white"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="Retail">Retail</option>
                                    <option value="Corporate">Corporate</option>
                                    <option value="Wholesale">Wholesale</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
                                <Button type="submit" className="bg-brand-red text-white hover:bg-red-700" disabled={formLoading}>
                                    {formLoading ? 'Saving...' : 'Save Agency'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
