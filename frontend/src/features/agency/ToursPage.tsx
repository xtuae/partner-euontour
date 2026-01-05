import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_TOURS = [
    {
        id: 'tour_1',
        name: 'Paris City Highlights',
        price: 50,
        duration: '3 hours',
        location: 'Paris, France',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1000',
        description: 'Experience the magic of Paris with our guided tour of the city\'s most iconic landmarks.'
    },
    {
        id: 'tour_2',
        name: 'Berlin Wall & Bike',
        price: 45,
        duration: '4 hours',
        location: 'Berlin, Germany',
        image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&q=80&w=1000',
        description: 'Explore the history of the Berlin Wall on this comprehensive bike tour.'
    },
    {
        id: 'tour_3',
        name: 'Rome Colosseum Express',
        price: 60,
        duration: '2 hours',
        location: 'Rome, Italy',
        image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=1000',
        description: 'Skip the line and dive straight into the history of the world\'s most famous amphitheater.'
    },
    {
        id: 'tour_4',
        name: 'Barcelona Gaudí Architecture',
        price: 55,
        duration: '3.5 hours',
        location: 'Barcelona, Spain',
        image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&q=80&w=1000',
        description: 'Discover the whimsical world of Antoni Gaudí and his masterpieces.'
    },
];

export function ToursPage() {
    const navigate = useNavigate();

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-brand-black">Available Tours</h1>
                <Button onClick={() => navigate('/agency/bookings')}>
                    Book a Tour
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_TOURS.map((tour) => (
                    <Card key={tour.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="h-48 overflow-hidden bg-gray-200">
                            <img
                                src={tour.image}
                                alt={tour.name}
                                className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                            />
                        </div>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl">{tour.name}</CardTitle>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand-red">
                                    €{tour.price}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{tour.description}</p>

                            <div className="space-y-2 text-sm text-gray-500 mb-6">
                                <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-brand-red" />
                                    {tour.location}
                                </div>
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-2" />
                                    {tour.duration}
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white"
                                onClick={() => navigate('/agency/bookings')}
                            >
                                Book Now
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
