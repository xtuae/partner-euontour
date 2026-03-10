import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { MapPin, Clock } from 'lucide-react';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { TourDetailsModal } from './TourDetailsModal';

const decodeHTML = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

export function ToursPage() {
    const [tours, setTours] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTour, setSelectedTour] = useState<any | null>(null);

    useEffect(() => {
        apiFetch('/api/tours')
            .then(res => res.json())
            .then(data => {
                setTours(data.tours || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading tours...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-brand-black">Available Tours</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tours.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                        No active tours available down this sales channel.
                    </div>
                ) : tours.map((tour) => (
                    <Card key={tour.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setSelectedTour(tour)}>
                        <div className="h-48 overflow-hidden bg-gray-200">
                            <img
                                src={tour.image_url || 'https://via.placeholder.com/400x250?text=Tour+Image'}
                                alt={decodeHTML(tour.name)}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                            />
                        </div>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl">{decodeHTML(tour.name)}</CardTitle>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand-red">
                                    €{tour.price}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm text-gray-500 mb-4">
                                <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-brand-red" />
                                    {tour.location || 'Location unavailable'}
                                </div>
                                {tour.duration && (
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-2" />
                                        {tour.duration}
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white"
                                onClick={(e) => { e.stopPropagation(); setSelectedTour(tour); }}
                            >
                                View Details
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {selectedTour && (
                <TourDetailsModal
                    tour={selectedTour}
                    onClose={() => setSelectedTour(null)}
                />
            )}
        </div>
    );
}
