import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <div className="md:pl-64 flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-6 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
