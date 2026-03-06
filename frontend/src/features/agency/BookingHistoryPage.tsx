import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { RefreshCw, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Badge } from '../../app/components/ui/Badge';

interface Tour {
    id: string;
    name: string;
}

interface Agency {
    name: string;
}

interface Booking {
    id: string;
    tour_id: string;
    agency_id: string;
    travel_date: string;
    amount: number;
    status: string;
    created_at: string;
    tour: Tour;
    agency?: Agency; // populated by the backend query
}

export function BookingHistoryPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchBookings = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch('/api/bookings');
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
            } else {
                setError('Failed to fetch booking history.');
            }
        } catch (err) {
            setError('Error loading bookings.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const generateInvoicePDF = (booking: Booking) => {
        const doc = new jsPDF();

        // Brand Header (Left)
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('EuOnTour.', 14, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('123 European Ave, Tourism District', 14, 32);
        doc.text('Berlin, Germany 10115', 14, 38);
        doc.text('Email: billing@euontour.com', 14, 44);

        // Invoice Details (Right)
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('INVOICE', 195, 25, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Invoice No: ${booking.id.substring(0, 8).toUpperCase()}`, 195, 32, { align: 'right' });
        doc.text(`Date of Issue: ${new Date().toLocaleDateString()}`, 195, 38, { align: 'right' });

        // Horizontal Line
        doc.setDrawColor(200);
        doc.line(14, 50, 195, 50);

        // Bill To
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('BILLED TO:', 14, 60);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const agencyName = booking.agency?.name || 'Partner Agency';
        doc.text(agencyName, 14, 68);
        doc.text(`Booking Reference: ${booking.id}`, 14, 74);
        doc.text(`Date of Purchase: ${new Date(booking.created_at).toLocaleDateString()}`, 14, 80);

        // Items Table using autoTable
        autoTable(doc, {
            startY: 95,
            head: [['Description', 'Travel Date', 'Status', 'Total (AED)']],
            body: [
                [
                    booking.tour?.name || 'Custom Tour',
                    new Date(booking.travel_date).toLocaleDateString(),
                    booking.status,
                    `${Number(booking.amount).toFixed(2)}`
                ]
            ],
            theme: 'striped',
            headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
            bodyStyles: { textColor: 50 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
        });

        // Financial Summary Footer
        const finalY = (doc as any).lastAutoTable.finalY || 120;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Total Paid:', 140, finalY + 15);
        doc.text(`AED ${Number(booking.amount).toFixed(2)}`, 195, finalY + 15, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Paid via Wallet Balance`, 195, finalY + 22, { align: 'right' });

        // Footer Note
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Thank you for partnering with EuOnTour. This is an electronically generated receipt.', 105, 280, { align: 'center' });

        // Trigger Download
        doc.save(`Invoice-${booking.id.substring(0, 8).toUpperCase()}.pdf`);
    };

    if (loading && bookings.length === 0) return <div className="p-8 text-center text-gray-500">Loading booking history...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-brand-black">Booking History</h1>
                <Button variant="outline" onClick={fetchBookings}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4">Booking ID</th>
                                    <th className="px-6 py-4">Tour details</th>
                                    <th className="px-6 py-4">Travel Date</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Invoice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No bookings found. Head to 'New Booking' to reserve a tour.
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map((booking) => (
                                        <tr key={booking.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-900">
                                                {booking.id.substring(0, 8)}...
                                                <div className="text-gray-400 mt-1">{new Date(booking.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {booking.tour?.name || 'Unknown Tour'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {new Date(booking.travel_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                AED {booking.amount}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={
                                                    booking.status === 'CONFIRMED' ? 'success' :
                                                        booking.status === 'CANCELLED' || booking.status === 'CANCELLED_BY_ADMIN' ? 'destructive' :
                                                            'default'
                                                }>
                                                    {booking.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="inline-flex items-center text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                                                    onClick={() => generateInvoicePDF(booking)}
                                                >
                                                    <Download className="w-4 h-4 mr-1.5" /> Receipt
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
