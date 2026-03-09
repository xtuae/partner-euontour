import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Badge } from '../../app/components/ui/Badge';
import { Button } from '../../app/components/ui/Button';
import { Download } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';

interface Booking {
    id: string;
    agency: { id: string; name: string; email: string };
    tour: { id: string; name: string };
    travel_date: string;
    guests: number;
    amount: string | number;
    status: string;
    isRetail?: boolean;
    created_at: string;
}

export function GlobalBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const fetchBookings = async () => {
        try {
            const res = await apiFetch('/api/super/bookings');
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
            }
        } catch (e) {
            console.error('Failed to fetch bookings:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBookings(); }, []);

    const handleCancel = async () => {
        if (!cancelTarget) return;
        setCancelling(true);
        try {
            const res = await apiFetch(`/api/super/bookings/${cancelTarget.id}/cancel`, { method: 'POST' });
            if (res.ok) {
                // Refresh bookings
                await fetchBookings();
                alert(`Booking cancelled. €${Number(cancelTarget.amount).toFixed(2)} refunded to ${cancelTarget.agency.name}.`);
            } else {
                const data = await res.json();
                alert(`Error: ${data.error || 'Failed to cancel booking'}`);
            }
        } catch (e) {
            alert('Network error. Please try again.');
        } finally {
            setCancelling(false);
            setCancelTarget(null);
        }
    };

    const getExportData = () => {
        return bookings.map(b => ({
            ID: b.id.slice(0, 8),
            'Agency Name': b.agency?.name || 'N/A',
            'Tour Name': b.tour?.name || 'N/A',
            Date: new Date(b.travel_date).toLocaleDateString(),
            Guests: b.guests || 1,
            Status: b.status,
            Amount: `€${Number(b.amount).toFixed(2)}`
        }));
    };

    const handleExportCSV = () => {
        exportToCSV(getExportData(), 'global_bookings');
    };

    const handleExportPDF = () => {
        const data = getExportData();
        const columns = ['ID', 'Agency Name', 'Tour Name', 'Date', 'Guests', 'Status', 'Amount'];
        exportToPDF(data, columns, 'global_bookings', 'Global Bookings');
    };

    const statusBadge = (status: string) => {
        const variant = status === 'CONFIRMED' ? 'success' :
            status === 'CANCELLED' || status === 'CANCELLED_BY_ADMIN' ? 'destructive' : 'default';
        const label = status === 'CANCELLED_BY_ADMIN' ? 'Cancelled (Admin)' : status;
        return <Badge variant={variant}>{label}</Badge>;
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading global bookings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Global Bookings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all agency bookings across the platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                    </Button>
                    <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 hidden sm:block">
                        <span className="font-semibold text-gray-900">{bookings.length}</span> Total Bookings
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Booking ID</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Agency</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tour</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Travel Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {bookings.map(b => (
                            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-mono text-gray-500">{b.id.slice(0, 8)}…</td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{b.agency?.name || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-gray-700">{b.tour?.name || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {new Date(b.travel_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">€{Number(b.amount).toFixed(2)}</td>
                                <td className="px-6 py-4">{statusBadge(b.status)}</td>
                                <td className="px-6 py-4 text-right">
                                    {(b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') && (
                                        <Button variant="destructive" size="sm" onClick={() => setCancelTarget(b)}>
                                            {b.isRetail || b.status === 'PENDING_PAYMENT' ? 'Cancel Booking' : 'Cancel & Refund'}
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {bookings.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    No bookings found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Cancellation Confirmation Modal */}
            {cancelTarget && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {cancelTarget.isRetail || cancelTarget.status === 'PENDING_PAYMENT' ? 'Cancel Booking' : 'Cancel Booking & Issue Refund'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {cancelTarget.isRetail || cancelTarget.status === 'PENDING_PAYMENT'
                                ? "Are you sure you want to cancel this retail booking? The payment link will be ignored."
                                : "Are you sure you want to cancel this booking? This action is irreversible."
                            }
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm border border-gray-100">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tour</span>
                                <span className="font-semibold text-gray-900">{cancelTarget.tour?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Agency</span>
                                <span className="font-semibold text-gray-900">{cancelTarget.agency?.name}</span>
                            </div>
                            {!(cancelTarget.isRetail || cancelTarget.status === 'PENDING_PAYMENT') && (
                                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                                    <span className="text-gray-500">Refund Amount</span>
                                    <span className="font-bold text-green-700 text-base">€{Number(cancelTarget.amount).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        {!(cancelTarget.isRetail || cancelTarget.status === 'PENDING_PAYMENT') && (
                            <p className="text-xs text-gray-500">
                                €{Number(cancelTarget.amount).toFixed(2)} will be automatically credited to <strong>{cancelTarget.agency?.name}</strong>'s wallet.
                            </p>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelling}>
                                Go Back
                            </Button>
                            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? 'Processing...' : (cancelTarget.isRetail || cancelTarget.status === 'PENDING_PAYMENT' ? 'Yes, Cancel' : 'Yes, Cancel & Refund')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
