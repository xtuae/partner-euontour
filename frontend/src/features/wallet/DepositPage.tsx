import { useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Euro, UploadCloud, Zap } from 'lucide-react';

export function DepositPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'manual' | 'online'>('manual');

    // Shared State
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Manual State
    const [proofFile, setProofFile] = useState<File | null>(null);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('amount', amount);
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
            const res = await apiFetch('/api/wallet/topup/online', {
                method: 'POST',
                body: JSON.stringify({ amount }),
            });

            if (!res.ok) throw new Error('Failed to initiate online payment');
            const data = await res.json();

            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
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
                <div className="border-4 border-black p-12 bg-green-400 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center transform rotate-1 hover:rotate-0 transition-transform">
                    <CheckCircle className="w-20 h-20 text-black mb-6 stroke-[3]" />
                    <h2 className="text-4xl font-black text-black uppercase tracking-tight mb-2">Funds Submitted</h2>
                    <p className="text-black font-medium text-lg border-t-4 border-black pt-4 mt-4">
                        Your deposit is pending admin approval. Redirecting...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 font-sans">
            <header className="mb-12 border-b-8 border-black pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-5xl md:text-7xl font-black text-black uppercase tracking-tighter leading-none">
                        Top Up <br /><span className="text-primary-600">Wallet.</span>
                    </h1>
                    <p className="text-xl font-bold mt-4 text-gray-800 bg-yellow-200 inline-block px-2 border-2 border-black">
                        SECURE TRANSFER & DEPOSIT
                    </p>
                </div>
            </header>

            {/* Neo-brutalist Tab Controls */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-4">
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 pl-4 pr-6 text-xl font-black uppercase tracking-wide border-4 border-black transition-all ${activeTab === 'manual'
                            ? 'bg-[#FF90E8] shadow-[6px_6px_0px_rgba(0,0,0,1)] translate-y-[-4px]'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                >
                    <UploadCloud className="w-6 h-6 stroke-[3]" />
                    Manual Bank Transfer
                </button>
                <button
                    onClick={() => setActiveTab('online')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 pl-4 pr-6 text-xl font-black uppercase tracking-wide border-4 border-black transition-all ${activeTab === 'online'
                            ? 'bg-[#ffe600] shadow-[6px_6px_0px_rgba(0,0,0,1)] translate-y-[-4px]'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                >
                    <Zap className="w-6 h-6 stroke-[3]" />
                    Pay Online
                </button>
            </div>

            <div className="bg-white border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)] p-6 md:p-10 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100 rounded-full border-4 border-black opacity-20 -mr-32 -mt-32 pointer-events-none"></div>

                {activeTab === 'manual' && (
                    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-[#f0f0f0] p-6 border-4 border-black mb-8 transform -rotate-1 relative">
                            <h3 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
                                <Euro className="w-8 h-8 bg-black text-white rounded-full p-1" />
                                Bank Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-lg font-medium font-mono">
                                <div><span className="text-gray-500 uppercase text-sm block">IBAN</span>DE12 3456 7890 1234 5678 90</div>
                                <div><span className="text-gray-500 uppercase text-sm block">BIC</span>EUONDEFF</div>
                                <div><span className="text-gray-500 uppercase text-sm block">Bank</span>Deutsche Bank</div>
                                <div><span className="text-gray-500 uppercase text-sm block">Reference</span>[YOUR_AGENCY_ID]</div>
                            </div>
                        </div>

                        <form onSubmit={handleManualSubmit} className="space-y-8">
                            <div className="space-y-3">
                                <label htmlFor="manual-amount" className="block text-2xl font-black uppercase tracking-tight">
                                    Amount (€)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-black">€</span>
                                    <input
                                        id="manual-amount"
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        placeholder="1000.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 text-3xl font-bold bg-white border-4 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-1 focus:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label htmlFor="proof" className="block text-2xl font-black uppercase tracking-tight">
                                    Proof of Transfer
                                </label>
                                <div className="border-4 border-black border-dashed bg-[#e8f4ff] p-8 text-center hover:bg-[#d0ebff] transition-colors cursor-pointer relative group">
                                    <input
                                        id="proof"
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        required
                                    />
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        <div className="bg-black text-white p-4 rounded-full group-hover:scale-110 transition-transform">
                                            <UploadCloud className="w-8 h-8 stroke-[2.5]" />
                                        </div>
                                        <div>
                                            {proofFile ? (
                                                <p className="text-xl font-bold text-black bg-white inline-block px-4 py-2 border-2 border-black">
                                                    {proofFile.name}
                                                </p>
                                            ) : (
                                                <>
                                                    <p className="text-2xl font-black uppercase">Drop file here or click</p>
                                                    <p className="text-black font-medium mt-2">PDF, JPG, PNG up to 10MB</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#FF90E8] text-black border-4 border-black py-5 text-2xl font-black uppercase tracking-wider shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'UPLOADING PROOF...' : 'SUBMIT MANUAL DEPOSIT'}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'online' && (
                    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-[#ffe600] p-6 border-4 border-black mb-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            <h3 className="text-xl font-black uppercase flex items-center gap-2">
                                <Zap className="w-6 h-6 fill-black" />
                                Instant Credit
                            </h3>
                            <p className="text-black font-medium text-lg mt-2">
                                Deposit funds via Credit Card or Local Payment methods. Funds are available instantly.
                            </p>
                        </div>

                        <form onSubmit={handleOnlineSubmit} className="space-y-8">
                            <div className="space-y-3">
                                <label htmlFor="online-amount" className="block text-2xl font-black uppercase tracking-tight">
                                    Amount to Deposit (€)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-black">€</span>
                                    <input
                                        id="online-amount"
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        placeholder="500.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-12 pr-4 py-6 text-4xl font-black bg-white border-4 border-black rounded-none shadow-[8px_8px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-2 focus:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#111] text-[#ffe600] border-4 border-black py-6 text-3xl font-black uppercase tracking-wider shadow-[8px_8px_0px_rgba(#ffe600,1)] hover:bg-black hover:translate-y-2 hover:shadow-[2px_2px_0px_rgba(#ffe600,1)] active:translate-y-4 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4"
                                style={{ boxShadow: loading ? 'none' : '8px 8px 0px 0px #ffe600' }}
                            >
                                <Zap className={`w-8 h-8 ${loading ? 'animate-pulse' : ''}`} />
                                {loading ? 'PROCESSING...' : 'PAY ONLINE NOW'}
                            </button>
                            <p className="text-center font-bold text-gray-500 uppercase tracking-widest text-sm mt-4">
                                SECURE CHECKOUT VIA STRIPE
                            </p>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
