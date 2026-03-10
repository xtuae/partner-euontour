import { useState } from 'react';
import { Button } from '../../app/components/ui/Button';
import { X, MapPin, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Navigation } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { toast } from 'react-hot-toast';

interface Tour {
    id: string;
    name: string;
    location?: string;
    description?: string;
    duration?: string;
    price: number;
    agency_net_price: number;
    image_url?: string;
    gallery?: string[];
    inclusions?: string[];
    exclusions?: string[];
    itinerary?: any;
    meetingPoint?: string;
}

interface TourDetailsModalProps {
    tour: Tour;
    onClose: () => void;
}

const decodeHTML = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

export function TourDetailsModal({ tour, onClose }: TourDetailsModalProps) {
    const [selectedImage, setSelectedImage] = useState(tour.image_url || '');
    const [travelDate, setTravelDate] = useState('');
    const [guests, setGuests] = useState(1);
    const [booking, setBooking] = useState(false);
    const [openDay, setOpenDay] = useState<number | null>(null);

    // Pickup Details
    const [hotelName, setHotelName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    const gallery = tour.gallery?.length ? tour.gallery : (tour.image_url ? [tour.image_url] : []);
    const itineraryItems = Array.isArray(tour.itinerary) ? tour.itinerary : [];

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!travelDate) {
            toast.error('Please select a travel date.');
            return;
        }
        setBooking(true);
        try {
            const res = await apiFetch('/api/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    tourId: tour.id,
                    travelDate,
                    guests,
                    hotelName,
                    contactPerson,
                    contactPhone
                })
            });
            if (res.ok) {
                toast.success('Booking confirmed! Funds deducted from wallet.');
                onClose();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Booking failed.');
            }
        } catch (err) {
            toast.error('Network error. Please try again.');
        } finally {
            setBooking(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </button>

                {/* Hero Image */}
                <div className="h-72 overflow-hidden rounded-t-2xl bg-gray-200 relative">
                    <img
                        src={selectedImage || 'https://via.placeholder.com/800x400?text=Tour'}
                        alt={decodeHTML(tour.name)}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                        <h2 className="text-2xl font-bold text-white">{decodeHTML(tour.name)}</h2>
                        <div className="flex items-center gap-4 text-white/80 text-sm mt-2">
                            {tour.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" /> {tour.location}
                                </span>
                            )}
                            {tour.duration && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> {tour.duration}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Gallery Thumbnails */}
                {gallery.length > 1 && (
                    <div className="flex gap-2 px-6 pt-4 overflow-x-auto pb-2">
                        {gallery.map((img, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedImage(img)}
                                className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-brand-red shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                            >
                                <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                    {/* Left: Details */}
                    <div className="lg:col-span-3 p-6 space-y-6">
                        {/* Description */}
                        {tour.description && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Tour</h3>
                                <div
                                    className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: tour.description }}
                                />
                            </div>
                        )}

                        {/* Inclusions / Exclusions */}
                        {((tour.inclusions && tour.inclusions.length > 0) || (tour.exclusions && tour.exclusions.length > 0)) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {tour.inclusions && tour.inclusions.length > 0 && (
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-1.5">
                                            <CheckCircle className="w-4 h-4" /> What's Included
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {tour.inclusions.map((item, i) => (
                                                <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                                                    <span className="text-green-500 mt-0.5">✓</span> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {tour.exclusions && tour.exclusions.length > 0 && (
                                    <div className="bg-red-50 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-1.5">
                                            <XCircle className="w-4 h-4" /> Not Included
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {tour.exclusions.map((item, i) => (
                                                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                                    <span className="text-red-400 mt-0.5">✗</span> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Itinerary Accordion */}
                        {itineraryItems.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Itinerary</h3>
                                <div className="space-y-2">
                                    {itineraryItems.map((day: any, i: number) => (
                                        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setOpenDay(openDay === i ? null : i)}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                            >
                                                <span className="font-medium text-sm text-gray-900">
                                                    {day.title || `Day ${i + 1}`}
                                                </span>
                                                {openDay === i ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                            </button>
                                            {openDay === i && (
                                                <div className="px-4 py-3 text-sm text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {day.description || day.content || 'No details available.'}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Meeting Point */}
                        {tour.meetingPoint && (
                            <div className="bg-blue-50 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                                    <Navigation className="w-4 h-4" /> Meeting Point
                                </h4>
                                <p className="text-sm text-blue-700">{tour.meetingPoint}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Booking Form */}
                    <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-gray-100 p-6 bg-gray-50/50">
                        <div className="sticky top-6">
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <div className="flex items-baseline justify-between mb-4">
                                    <div>
                                        <span className="text-2xl font-bold text-gray-900">€{Number(tour.agency_net_price).toFixed(2)}</span>
                                        <span className="text-sm text-gray-500 ml-1">/ person</span>
                                    </div>
                                    <span className="text-xs line-through text-gray-400">€{Number(tour.price).toFixed(2)}</span>
                                </div>

                                <form onSubmit={handleBook} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Travel Date</label>
                                        <input
                                            type="date"
                                            value={travelDate}
                                            onChange={(e) => setTravelDate(e.target.value)}
                                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-red focus:border-brand-red text-sm outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Guests</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={50}
                                            value={guests}
                                            onChange={(e) => setGuests(Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-red focus:border-brand-red text-sm outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Hotel Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Hilton Dubai"
                                            value={hotelName}
                                            onChange={(e) => setHotelName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Contact Person</label>
                                        <input
                                            type="text"
                                            placeholder="Full name"
                                            value={contactPerson}
                                            onChange={(e) => setContactPerson(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Contact Phone</label>
                                        <input
                                            type="tel"
                                            placeholder="+971 50 000 0000"
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                                        />
                                    </div>

                                    <div className="pt-2 border-t border-gray-100">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-500">{guests} × €{Number(tour.agency_net_price).toFixed(2)}</span>
                                            <span className="font-semibold text-gray-900">€{(guests * Number(tour.agency_net_price)).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={booking}
                                        className="w-full bg-brand-red hover:bg-red-700 text-white"
                                        size="lg"
                                    >
                                        {booking ? 'Processing...' : 'Confirm Booking'}
                                    </Button>
                                    <p className="text-xs text-center text-gray-400">Funds will be deducted from your wallet</p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
