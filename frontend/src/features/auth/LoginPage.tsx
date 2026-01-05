import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';
import logo from '../../assets/logo.webp';

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const user = await login(email, password);

            // Redirect based on role
            switch (user.role) {
                case 'AGENCY':
                    navigate('/agency/dashboard');
                    break;
                case 'ADMIN':
                    navigate('/admin/dashboard');
                    break;
                case 'SUPER_ADMIN':
                    navigate('/super-admin/dashboard'); // Assuming this exists or map correctly
                    break;
                default:
                    navigate('/'); // Fallback
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white">

            <div className="w-full max-w-[400px] bg-white rounded-lg border border-brand-gray shadow-sm">
                <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center mb-4">
                            {/* Logo Fallback */}
                            <div className="h-12 w-auto">
                                <img src={logo} alt="EuOnTour Logo" className="h-full w-auto object-contain" />
                            </div>
                        </div>
                        <h1 className="text-xl font-semibold text-brand-black">Partner Login</h1>
                        <p className="mt-2 text-sm text-brand-dark">Enter your credentials to access the dashboard.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray rounded cursor-pointer"
                                />
                                <label htmlFor="remember-me" className="text-sm text-brand-dark cursor-pointer select-none">
                                    Remember me
                                </label>
                            </div>
                            <button type="button" className="text-sm font-medium text-brand-red hover:text-brand-hover">
                                Forgot password?
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-brand-red px-4 py-3 rounded-lg text-sm flex items-start">
                                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-brand-red hover:bg-brand-hover"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>
                </div>

                <div className="px-6 py-4 bg-brand-light border-t border-brand-gray rounded-b-lg text-center">
                    <p className="text-sm text-brand-dark">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-brand-red hover:text-brand-hover">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>

            <p className="mt-8 text-center text-xs text-gray-400">
                &copy; 2026 euontour.com. All rights reserved.
            </p>
        </div>
    );
}
