import { useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';
import { CheckCircle } from 'lucide-react';

export function DepositPage() {
    const navigate = useNavigate();
    const [amount, setAmount] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('amount', amount);
            if (proofFile) {
                formData.append('proof_image', proofFile);
            } else {
                // Handle mock or error
                // For now, if no file, backend might reject if not mocked
                // We'll enforce file selection in UI or send dummy if strictly dev
            }

            const res = await apiFetch('/api/deposits/submit', { // Path updated for clarity
                method: 'POST',
                // Content-Type header is auto-set by fetch when body is FormData
                body: formData as any, // TS might complain about BodyInit type mismatch in custom wrappers
            });

            if (!res.ok) throw new Error('Failed');

            setSuccess(true);
            setTimeout(() => navigate('/agency/wallet'), 2000);
        } catch (err) {
            alert('Deposit failed');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Deposit Submitted!</h2>
                <p className="text-gray-500">Your deposit is pending admin approval.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-brand-black mb-6">Deposit Funds</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Bank Transfer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                        <p className="font-semibold mb-2">EuOnTour Bank Account</p>
                        <p>IBAN: DE12 3456 7890 1234 5678 90</p>
                        <p>BIC: EUONDEFF</p>
                        <p>Bank: Deutsche Bank</p>
                        <p className="mt-2 text-gray-500 italic">Please include your Agency ID in the reference.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (€)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="1000.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="proof">Upload Proof of Payment</Label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Deposit Request'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
