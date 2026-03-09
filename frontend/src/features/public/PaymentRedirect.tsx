import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api-client';

export function PaymentRedirect() {
    const { id } = useParams<{ id: string }>();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError('Invalid payment link');
            return;
        }

        const fetchPaymentLink = async () => {
            try {
                // Fetch the real Stripe URL from the public backend
                const res = await apiFetch(`/api/public/pay/${id}`);
                const data = await res.json();

                if (res.ok && data.stripeSessionUrl) {
                    window.location.href = data.stripeSessionUrl;
                } else {
                    setError(data.error || 'Payment link expired or not found.');
                }
            } catch (err: any) {
                setError('Failed to load payment portal. Please check your connection.');
            }
        };

        fetchPaymentLink();
    }, [id]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-sm border border-red-100 max-w-md text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Link Error</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-800">Securing your payment...</h2>
                <p className="text-gray-500 mt-2">Redirecting to checkout</p>
            </div>
        </div>
    );
}
