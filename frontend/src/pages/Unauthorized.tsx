import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
            <p className="text-gray-600 mb-6">You do not have permission to access this page.</p>
            <Link to="/" className="text-brand-red hover:underline font-medium">
                Return Home
            </Link>
        </div>
    );
}
