import { useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Euro, UploadCloud, Zap } from 'lucide-react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';

export function DepositPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'manual' | 'online'>('manual');

    // Shared State
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Manual State
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [referenceNumber, setReferenceNumber] = useState('');

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('referenceNumber', referenceNumber);
            if (proofFile) {
                formData.append('proof_image', proofFile);
            }

            const res = await apiFetch('/api/deposits', {
                method: 'POST',
                body: formData as any,
            });

            if (!res.ok) throw new Error('Failed to submit deposit');

            setSuccess(true);
            setTimeout(() => navigate('/agency/wallet'), 2500);
        } catch (err) {
            alert('Deposit failed. Please try again or contact support.');
            setLoading(false);
        }
    };

    const handleOnlineSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await apiFetch('/api/stripe/create-topup-session', {
                method: 'POST',
                body: JSON.stringify({ amount }),
            });

            if (!res.ok) throw new Error('Failed to initiate online payment');
            const data = await res.json();

            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (err) {
            alert('Payment initialization failed.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                <Card className="p-12 border-gray-200 flex flex-col items-center text-center shadow-sm w-full max-w-lg">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Funds Submitted</h2>
                    <p className="text-gray-500">
                        Your deposit is pending admin approval. Redirecting...
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">
                    Top Up Wallet
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Secure transfer & deposit.
                </p>
            </header>

            {/* Tab Controls */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'manual'
                        ? 'border-brand-red text-brand-red'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <UploadCloud className="w-4 h-4" />
                    Manual Bank Transfer
                </button>
                <button
                    onClick={() => setActiveTab('online')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'online'
                        ? 'border-brand-red text-brand-red'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Zap className="w-4 h-4" />
                    Pay Online
                </button>
            </div>

            <Card className="border-gray-200 shadow-sm overflow-hidden">
                {activeTab === 'manual' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-gray-50 p-6 border-b border-gray-100 mb-2">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Euro className="w-4 h-4 text-gray-500" />
                                Bank Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-700">
                                <div><span className="text-gray-400 block text-xs uppercase">IBAN</span>DE12 3456 7890 1234 5678 90</div>
                                <div><span className="text-gray-400 block text-xs uppercase">BIC</span>EUONDEFF</div>
                                <div><span className="text-gray-400 block text-xs uppercase">Bank</span>Deutsche Bank</div>
                                <div><span className="text-gray-400 block text-xs uppercase">Reference</span>[YOUR_AGENCY_ID]</div>
                            </div>
                        </div>

                        <CardContent className="p-6">
                            <form onSubmit={handleManualSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="manual-amount" className="block text-sm font-medium text-gray-700">
                                        Amount (€)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">€</span>
                                        <input
                                            id="manual-amount"
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            placeholder="1000.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-brand-red focus:border-brand-red transition-shadow outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="manual-reference" className="block text-sm font-medium text-gray-700">
                                        Bank Reference / Transaction ID
                                    </label>
                                    <input
                                        id="manual-reference"
                                        type="text"
                                        placeholder="e.g. TXN-9876543210"
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-brand-red focus:border-brand-red transition-shadow outline-none"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="proof" className="block text-sm font-medium text-gray-700">
                                        Proof of Transfer
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors relative cursor-pointer">
                                        <input
                                            id="proof"
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            required
                                        />
                                        <div className="space-y-1 text-center">
                                            {proofFile ? (
                                                <div className="flex flex-col items-center">
                                                    <UploadCloud className="mx-auto h-12 w-12 text-brand-red" />
                                                    <p className="mt-2 text-sm text-gray-900 font-medium">{proofFile.name}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="flex text-sm text-gray-600 justify-center">
                                                        <span className="relative cursor-pointer bg-white rounded-md font-medium text-brand-red hover:text-brand-red/80 focus-within:outline-none">
                                                            Click to upload
                                                        </span>
                                                        <p className="pl-1">or drag and drop</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">PDF, PNG, JPG up to 10MB</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full"
                                    size="lg"
                                >
                                    {loading ? 'Uploading Proof...' : 'Submit Manual Deposit'}
                                </Button>
                            </form>
                        </CardContent>
                    </div>
                )}

                {activeTab === 'online' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-yellow-50 p-6 border-b border-yellow-100 mb-2">
                            <h3 className="text-sm font-semibold text-yellow-800 uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-4 h-4 fill-yellow-600" />
                                Instant Credit
                            </h3>
                            <p className="text-yellow-700 text-sm mt-1">
                                Deposit funds via Credit Card or Local Payment methods. Funds are available instantly.
                            </p>
                        </div>

                        <CardContent className="p-6">
                            <form onSubmit={handleOnlineSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="online-amount" className="block text-sm font-medium text-gray-700">
                                        Amount to Deposit (€)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">€</span>
                                        <input
                                            id="online-amount"
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            placeholder="500.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-brand-red focus:border-brand-red transition-shadow outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-black hover:bg-gray-900 border-none"
                                    size="lg"
                                >
                                    <Zap className={`w-5 h-5 mr-2 ${loading ? 'animate-pulse' : ''}`} />
                                    {loading ? 'Processing...' : 'Pay Online Now'}
                                </Button>
                                <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mt-4">
                                    SECURE CHECKOUT VIA STRIPE
                                </p>
                            </form>
                        </CardContent>
                    </div>
                )}
            </Card>
        </div>
    );
}
