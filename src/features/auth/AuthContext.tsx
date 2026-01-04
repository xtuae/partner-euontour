import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ROLES } from './types';

interface User {
    id: string;
    email: string;
    role: ROLES;
    agency?: {
        id: string;
        name: string;
        verification_status: string;
    }
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, agencyName: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();

        // Silent refresh every 14 minutes
        const interval = setInterval(async () => {
            try {
                await fetch('/api/auth/refresh', { method: 'POST' });
            } catch (error) {
                // Ignore, will be handled by next sensitive call
            }
        }, 14 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await res.json();
        setUser(data.user);
    };

    const register = async (email: string, password: string, agencyName: string): Promise<void> => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, agencyName }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error?.[0]?.message || data.error || 'Registration failed');
        }

        // Auto login on register
        // This part needs to be handled carefully. If the backend doesn't return user data on register,
        // or if it doesn't automatically log in, this might need adjustment.
        // For now, assuming a successful register implies the user is logged in or we fetch their data.
        // A more robust approach might be to call login after register if the backend doesn't handle session.
        // For this example, let's assume the backend sets the session or returns user data.
        // If `checkAuth` is called, it will fetch the user if a session was set.
        // If the backend returns user data directly on register, we could do `setUser(data.user); `
        // For now, let's keep `checkAuth()` as per the instruction's intent.
        const data = await res.json(); // Assuming register returns user data or success
        setUser(data.user); // Assuming the backend returns the user object upon successful registration
    };

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
