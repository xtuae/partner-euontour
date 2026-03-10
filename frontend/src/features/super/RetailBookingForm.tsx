import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';
import { CheckCircle, Copy, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function RetailBookingForm() {
    const [tours, setTours] = useState<any[]>([]);
    const [selectedTour, setSelectedTour] = useState('');
    const [date, setDate] = useState('');
    const [pax, setPax] = useState('2');
    const [customerEmail, setCustomerEmail] = useState('');
    const [hotelName, setHotelName] = useState('');
    const [hotelAddress, setHotelAddress] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [additionalInfo, setAdditionalInfo] = useState('');

    const [loading, setLoading] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        apiFetch('/api/tours')
            .then(res => res.json())
            .then(data => {
                const tourList = data.tours || [];
                setTours(tourList);
                if (tourList.length > 0) setSelectedTour(tourList[0].id);
            })
            .catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const paxNum = parseInt(pax, 10);
        if (paxNum < 2) {
            toast.error("A minimum of 2 guests is required.");
            return;
        }

        setLoading(true);
        setError('');
        setCheckoutUrl('');
        setCopied(false);

        try {
            const payload = {
                tourId: selectedTour,
                travelDate: date || new Date().toISOString().split('T')[0],
                pax: parseInt(pax, 10),
                customerEmail,
                hotelName,
                hotelAddress,
                contactPerson,
                contactPhone,
                additionalInfo
            };

            const res = await apiFetch('/api/super/bookings/retail', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate retail booking link');
            }

            const data = await res.json();
            setCheckoutUrl(`${window.location.origin}/#/pay/${data.bookingId}`);
        } catch (err: any) {
            setError(err.message || 'Error creating retail link');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!checkoutUrl) return;
        navigator.clipboard.writeText(checkoutUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (checkoutUrl) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-gray-100 shadow-sm mt-8">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Link Ready!</h2>
                <p className="text-gray-500 mb-6">Send this secure Stripe payment link to your retail customer.</p>

                <div className="flex w-full max-w-lg items-center space-x-2">
                    <Input value={checkoutUrl} readOnly className="bg-gray-50 border-gray-200 text-gray-600" />
                    <Button onClick={handleCopy} variant="outline" className="shrink-0 flex gap-2">
                        {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                </div>

                <Button
                    variant="outline"
                    className="mt-8"
                    onClick={() => {
                        setCheckoutUrl('');
                        setCustomerEmail('');
                        setHotelName('');
                        setHotelAddress('');
                        setContactPerson('');
                        setContactPhone('');
                        setAdditionalInfo('');
                    }}
                >
                    Create Another Link
                </Button>
            </div>
        );
    }

    const decodeHTML = (html: string) => {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-brand-black mb-6 flex items-center gap-3">
                <LinkIcon className="w-8 h-8 text-brand-red" />
                Generate Retail Link
            </h1>
            <p className="text-gray-600 mb-8">
                Create a secure B2C Stripe Checkout session. This will compute the full retail price with 19% MWST.
            </p>
            <Card>
                <CardHeader>
                    <CardTitle>Customer & Tour Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="customerEmail">Customer Email</Label>
                            <Input
                                id="customerEmail"
                                type="email"
                                placeholder="customer@example.com"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hotelName">Hotel Name</Label>
                                <Input
                                    id="hotelName"
                                    type="text"
                                    placeholder="Hilton Berlin"
                                    value={hotelName}
                                    onChange={(e) => setHotelName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="hotelAddress">Hotel Address</Label>
                                <Input
                                    id="hotelAddress"
                                    type="text"
                                    placeholder="Mohrenstr. 30, 10117"
                                    value={hotelAddress}
                                    onChange={(e) => setHotelAddress(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactPerson">Lead Guest Name</Label>
                                <Input
                                    id="contactPerson"
                                    type="text"
                                    placeholder="John Doe"
                                    value={contactPerson}
                                    onChange={(e) => setContactPerson(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contactPhone">Contact Phone</Label>
                                <Input
                                    id="contactPhone"
                                    type="tel"
                                    placeholder="+49 152 12345678"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="additionalInfo">Additional Information</Label>
                            <textarea
                                id="additionalInfo"
                                className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-red outline-none"
                                placeholder="Flight numbers, delays, special requests..."
                                value={additionalInfo}
                                onChange={(e) => setAdditionalInfo(e.target.value)}
                            />
                        </div>

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
                                        {decodeHTML(tour.name)} - €{tour.price}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
                                    min="2"
                                    max="8"
                                    value={pax}
                                    onChange={(e) => setPax(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-6" disabled={loading}>
                            {loading ? 'Generating Link...' : 'Generate Payment Link'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
