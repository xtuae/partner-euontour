export function AgencyDashboard() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Agency Dashboard</h1>
            <p className="text-gray-600">Prepare trip packages and manage bookings.</p>
        </div>
    );
}

export function AdminDashboard() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
            <p className="text-gray-600">Review verifications and approve deposits.</p>
        </div>
    );
}

export function SuperAdminDashboard() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Super Admin Dashboard</h1>
            <p className="text-gray-600">System-wide settings and financial overview.</p>
        </div>
    );
}
