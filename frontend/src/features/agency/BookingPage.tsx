import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const MOCK_TOURS = [
    { id: 'tour_1', name: 'Paris City Highlights', price: 50 },
    { id: 'tour_2', name: 'Berlin Wall & Bike', price: 45 },
    { id: 'tour_3', name: 'Rome Colosseum Express', price: 60 },
];

export function BookingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const [selectedTour, setSelectedTour] = useState(MOCK_TOURS[0].id);
    const [date, setDate] = useState('');
    const [pax, setPax] = useState('2');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [agencies, setAgencies] = useState<{ id: string, name: string }[]>([]);
    const [selectedAgency, setSelectedAgency] = useState('');

    useEffect(() => {
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
                date: date || new Date().toISOString().split('T')[0],
                pax: parseInt(pax, 10),
            };

            if (isSuperAdmin && selectedAgency) {
                payload.targetAgencyId = selectedAgency;
            }

            const res = await apiFetch('/api/bookings/create', {
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
                                {MOCK_TOURS.map(tour => (
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

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Processing...' : 'Confirm Booking'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
