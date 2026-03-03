import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
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
            <h1 className="text-2xl font-bold mb-6">Agency Verifications</h1>

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
        </div>
    );
}
