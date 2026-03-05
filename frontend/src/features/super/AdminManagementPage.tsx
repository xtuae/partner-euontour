import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { apiFetch } from '../../lib/api-client';
import { UserPlus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
    last_login: string | null;
}

export function AdminManagementPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

    // Form states
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'ADMIN', active: true });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/super/admins');
            if (res.ok) {
                const data = await res.json();
                setAdmins(data.admins);
            }
        } catch (error) {
            console.error('Failed to fetch admins', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await apiFetch('/api/super/admins', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                setFormData({ name: '', email: '', password: '', role: 'ADMIN', active: true });
                fetchAdmins();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create admin');
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAdmin) return;
        setIsSubmitting(true);
        try {
            const res = await apiFetch(`/api/super/admins/${editingAdmin.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: formData.name, email: formData.email, active: formData.active })
            });
            if (res.ok) {
                setIsEditModalOpen(false);
                fetchAdmins();
            } else {
                alert('Failed to update admin');
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (adminId: string) => {
        if (!confirm('Are you sure you want to deactivate and remove this admin?')) return;
        try {
            const res = await apiFetch(`/api/super/admins/${adminId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAdmins();
            } else {
                alert('Failed to delete admin');
            }
        } catch (error) {
            alert('An error occurred');
        }
    };

    const openEditModal = (admin: AdminUser) => {
        setEditingAdmin(admin);
        setFormData({ name: admin.name || '', email: admin.email, password: '', role: admin.role, active: admin.active });
        setIsEditModalOpen(true);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading admins...</div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Internal Admins</h1>
                <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center">
                    <UserPlus className="w-4 h-4 mr-2" /> Add Admin
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Staff Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-600">Name</th>
                                    <th className="p-3 font-semibold text-gray-600">Email</th>
                                    <th className="p-3 font-semibold text-gray-600">Role</th>
                                    <th className="p-3 font-semibold text-gray-600">Status</th>
                                    <th className="p-3 font-semibold text-gray-600">Last Login</th>
                                    <th className="p-3 font-semibold text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(admin => (
                                    <tr key={admin.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium text-gray-800">{admin.name || 'N/A'}</td>
                                        <td className="p-3 text-gray-600">{admin.email}</td>
                                        <td className="p-3 text-brand-red font-medium text-sm">{admin.role}</td>
                                        <td className="p-3">
                                            {admin.active ? (
                                                <span className="flex items-center text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full w-max"><CheckCircle size={12} className="mr-1" /> Active</span>
                                            ) : (
                                                <span className="flex items-center text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full w-max"><XCircle size={12} className="mr-1" /> Inactive</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-sm text-gray-500">{admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}</td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => openEditModal(admin)} className="text-gray-500 hover:text-blue-600 mx-2" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            {admin.role !== 'SUPER_ADMIN' && (
                                                <button onClick={() => handleDelete(admin.id)} className="text-gray-500 hover:text-red-600 mx-2" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Create New Admin</h2>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input required type="text" className="mt-1 w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                <input required type="email" className="mt-1 w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input required type="password" minLength={6} className="mt-1 w-full border p-2 rounded" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Admin'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editingAdmin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Edit Admin: {editingAdmin.name}</h2>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input required type="text" className="mt-1 w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                <input required type="email" className="mt-1 w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="flex items-center mt-4">
                                <input type="checkbox" id="activeStatus" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} className="mr-2" />
                                <label htmlFor="activeStatus" className="text-sm font-medium text-gray-700">Account is Active</label>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
