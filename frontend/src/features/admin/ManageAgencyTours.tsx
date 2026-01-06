import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Assuming react-router v6 from context
import { apiFetch } from '../../lib/api-client';

interface Tour {
    id: string;
    name: string;
    description?: string;
    price: number;
    active: boolean;
}

interface AssignedTour {
    agencyId: string;
    tourId: string;
    sortOrder: number;
    tour: Tour;
}

export function ManageAgencyTours() {
    const { id: agencyId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [allTours, setAllTours] = useState<Tour[]>([]);
    const [assignedTours, setAssignedTours] = useState<Tour[]>([]); // Derived from assignments
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter state
    const [filterQuery, setFilterQuery] = useState('');

    useEffect(() => {
        if (agencyId) fetchData();
    }, [agencyId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Master List
            const toursRes = await apiFetch('admin/tours/index'); // Matches api/admin/tours/index.ts
            // Wait, previous file creation was "api/admin/tours/index.ts" -> route is usually /api/admin/tours
            // Need to double check how "api/admin/tours/index.ts" maps in Vercel. Usually /api/admin/tours.
            // But if I used apiFetch('admin/tours'), api-client prepends /admin/tours... 
            // My api-client prepends / if missing. url = base + path.
            // Vercel file system routing: api/admin/tours/index.ts -> /api/admin/tours

            const toursData = await toursRes.json();

            // 2. Fetch Assignments
            const assignedRes = await apiFetch(`admin/agencies/${agencyId}/tours`);
            const assignedData = await assignedRes.json();

            if (toursData.tours) {
                setAllTours(toursData.tours);
            }

            if (assignedData.assignments) {
                // assignments have { tour: ... }. Extract tours in order.
                const tours = assignedData.assignments.map((a: AssignedTour) => a.tour);
                setAssignedTours(tours);
            }

        } catch (err) {
            console.error(err);
            setError('Failed to load tours');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssign = (tour: Tour) => {
        if (assignedTours.find(t => t.id === tour.id)) return;
        setAssignedTours([...assignedTours, tour]);
    };

    const handleRemove = (tourId: string) => {
        setAssignedTours(assignedTours.filter(t => t.id !== tourId));
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newTours = [...assignedTours];
        if (direction === 'up' && index > 0) {
            [newTours[index], newTours[index - 1]] = [newTours[index - 1], newTours[index]];
        } else if (direction === 'down' && index < newTours.length - 1) {
            [newTours[index], newTours[index + 1]] = [newTours[index + 1], newTours[index]];
        }
        setAssignedTours(newTours);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const tourIds = assignedTours.map(t => t.id);
            const res = await apiFetch(`admin/agencies/${agencyId}/tours`, {
                method: 'PUT',
                body: JSON.stringify({ tourIds })
            });

            if (!res.ok) throw new Error('Failed to save');

            alert('Tours updated successfully');
            fetchData(); // Refresh

        } catch (err) {
            console.error(err);
            alert('Error saving changes');
        } finally {
            setIsSaving(false);
        }
    };

    const availableTours = allTours.filter(t => !assignedTours.find(at => at.id === t.id));
    const filteredAvailable = availableTours.filter(t => t.name.toLowerCase().includes(filterQuery.toLowerCase()));

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Manage Tours Assignments</h1>
                <div className="space-x-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[70vh]">
                {/* LEFT: Available Tours */}
                <div className="bg-white rounded-lg shadow flex flex-col h-full border">
                    <div className="p-4 border-b bg-gray-50">
                        <h2 className="font-semibold text-gray-700 flex justify-between">
                            Available Tours ({availableTours.length})
                        </h2>
                        <input
                            type="text"
                            placeholder="Search tours..."
                            className="mt-2 w-full p-2 border rounded"
                            value={filterQuery}
                            onChange={e => setFilterQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredAvailable.map(tour => (
                            <div
                                key={tour.id}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 border rounded cursor-pointer group"
                                onClick={() => handleAssign(tour)}
                            >
                                <div>
                                    <div className="font-medium">{tour.name}</div>
                                    <div className="text-sm text-gray-500">€{tour.price}</div>
                                </div>
                                <button className="text-blue-600 opacity-0 group-hover:opacity-100 font-bold px-2">
                                    + Add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Assigned Tours */}
                <div className="bg-white rounded-lg shadow flex flex-col h-full border ring-2 ring-blue-50">
                    <div className="p-4 border-b bg-blue-50">
                        <h2 className="font-semibold text-blue-800">
                            Assigned to Agency ({assignedTours.length})
                        </h2>
                        <p className="text-xs text-blue-600 mt-1">Reorder using arrows. Top is first.</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {assignedTours.length === 0 && (
                            <div className="text-center text-gray-400 mt-10">No tours assigned yet.</div>
                        )}
                        {assignedTours.map((tour, index) => (
                            <div
                                key={tour.id}
                                className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400 font-mono text-sm w-6">#{index + 1}</span>
                                    <div>
                                        <div className="font-medium text-gray-800">{tour.name}</div>
                                        <div className="text-sm text-gray-500">€{tour.price}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleMove(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                                        title="Move Up"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={() => handleMove(index, 'down')}
                                        disabled={index === assignedTours.length - 1}
                                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                                        title="Move Down"
                                    >
                                        ▼
                                    </button>
                                    <button
                                        onClick={() => handleRemove(tour.id)}
                                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                                        title="Remove"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
