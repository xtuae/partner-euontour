import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api-client';
import { Button } from '../../app/components/ui/Button';

export const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            return;
        }

        const verify = async () => {
            try {
                await apiFetch(`/auth/verify-email?token=${token}`);
                setStatus('success');
            } catch (error) {
                console.error('Verification failed', error);
                setStatus('error');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
            <div className="w-full max-w-md p-8 bg-neutral-800 rounded-xl shadow-2xl text-center space-y-6">
                {status === 'verifying' && (
                    <>
                        <h2 className="text-2xl font-bold animate-pulse">Verifying your email...</h2>
                        <p className="text-gray-400">Please wait while we confirm your identity.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h2 className="text-2xl font-bold text-green-400">Email Verified!</h2>
                        <p className="text-gray-300">Your account has been successfully verified.</p>
                        <Button onClick={() => navigate('/login')} className="w-full">
                            Continue to Login
                        </Button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-3xl">❌</span>
                        </div>
                        <h2 className="text-2xl font-bold text-red-500">Verification Failed</h2>
                        <p className="text-gray-300">The link may be invalid or expired.</p>
                        <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
                            Return to Login
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
