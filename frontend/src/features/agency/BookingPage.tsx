import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

// dynamic tours fetched below

export function BookingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const [tours, setTours] = useState<any[]>([]);
    const [selectedTour, setSelectedTour] = useState('');
    const [date, setDate] = useState('');
    const [pax, setPax] = useState('2');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [agencies, setAgencies] = useState<{ id: string, name: string }[]>([]);
    const [selectedAgency, setSelectedAgency] = useState('');

    // --- Pricing Engine ---
    const discountPercent = 10;

    // Find the currently selected tour object to extract its price
    const currentTourObj = useMemo(() => tours.find(t => t.id === selectedTour), [tours, selectedTour]);

    const orderSummary = useMemo(() => {
        if (!currentTourObj) return null;
        const paxCount = parseInt(pax, 10) || 1;
        const subtotal = Number(currentTourObj.price) * paxCount;
        const discountAmount = subtotal * (discountPercent / 100);
        const netPrice = subtotal - discountAmount;
        const vatAmount = netPrice * 0.19;
        const finalTotal = netPrice + vatAmount;

        return {
            subtotal: subtotal.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            vatAmount: vatAmount.toFixed(2),
            finalTotal: finalTotal.toFixed(2)
        };
    }, [currentTourObj, pax]);

    useEffect(() => {
        apiFetch('/api/tours')
            .then(res => res.json())
            .then(data => {
                const tourList = data.tours || [];
                setTours(tourList);
                if (tourList.length > 0) setSelectedTour(tourList[0].id);
            })
            .catch(err => {
                console.error(err);
            });

        if (isSuperAdmin) {
            apiFetch('/api/admin/agencies')
                .then(res => res.json())
                .then(data => {
                    const verified = data.agencies?.filter((a: any) => a.verification_status === 'VERIFIED') || [];
                    setAgencies(verified);
                    if (verified.length > 0) {
                        setSelectedAgency(verified[0].id);
                    }
                })
                .catch(console.error);
        }
    }, [isSuperAdmin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload: any = {
                tourId: selectedTour,
                travelDate: date || new Date().toISOString().split('T')[0],
                pax: parseInt(pax, 10),
            };

            if (isSuperAdmin && selectedAgency) {
                payload.targetAgencyId = selectedAgency;
            }

            const res = await apiFetch('/api/bookings', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create booking');
            }

            setSuccess(true);
            setTimeout(() => navigate('/agency/bookings'), 2000); // Or back to list
        } catch (err: any) {
            setError(err.message || 'Booking failed');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Booking Confirmed!</h2>
                <p className="text-gray-500">Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-brand-black mb-6">New Booking</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Tour Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                                {error}
                            </div>
                        )}

                        {isSuperAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="agency">Target Agency (Proxy Booking)</Label>
                                <select
                                    id="agency"
                                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-red outline-none"
                                    value={selectedAgency}
                                    onChange={(e) => setSelectedAgency(e.target.value)}
                                    required
                                >
                                    {agencies.map(agency => (
                                        <option key={agency.id} value={agency.id}>
                                            {agency.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="tour">Select Tour</Label>
                            <select
                                id="tour"
                                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-red outline-none"
                                value={selectedTour}
                                onChange={(e) => setSelectedTour(e.target.value)}
                            >
                                {tours.map(tour => (
                                    <option key={tour.id} value={tour.id}>
                                        {tour.name} - €{tour.price}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Travel Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pax">Number of Guests</Label>
                            <Input
                                id="pax"
                                type="number"
                                min="1"
                                value={pax}
                                onChange={(e) => setPax(e.target.value)}
                                required
                            />
                        </div>

                        {orderSummary && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 mt-4">
                                <h3 className="font-semibold text-gray-800 text-sm tracking-wide uppercase border-b pb-2 mb-2">Order Summary</h3>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal ({pax} {parseInt(pax) === 1 ? 'Guest' : 'Guests'})</span>
                                    <span>€{orderSummary.subtotal}</span>
                                </div>
                                <div className="flex justify-between text-sm text-brand-red">
                                    <span>Agency Discount ({discountPercent}%)</span>
                                    <span>-€{orderSummary.discountAmount}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>MWST (19%)</span>
                                    <span>€{orderSummary.vatAmount}</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-900 text-lg border-t pt-2 mt-2">
                                    <span>Total to Deduct</span>
                                    <span>€{orderSummary.finalTotal}</span>
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full mt-6" disabled={loading}>
                            {loading ? 'Processing...' : 'Confirm Booking'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
