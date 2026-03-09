import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Badge } from '../../app/components/ui/Badge';
import { Input } from '../../app/components/ui/Input';
import { Textarea } from '../../app/components/ui/Textarea';
import { Lock, Unlock, LogOut, Mail } from 'lucide-react';

// Custom Tabs for this page
function Tabs({ defaultValue, children, className }: { defaultValue: string, children: React.ReactNode, className?: string }) {
    const [activeTab, setActiveTab] = useState(defaultValue);

    return (
        <div className={className}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { activeTab, setActiveTab } as any);
                }
                return child;
            })}
        </div>
    );
}

function TabsList({ children, activeTab, setActiveTab }: any) {
    return (
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 mb-4">
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { activeTab, setActiveTab } as any);
                }
                return child;
            })}
        </div>
    );
}

function TabsTrigger({ value, children, activeTab, setActiveTab }: any) {
    const isActive = activeTab === value;
    return (
        <button
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${isActive ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
            onClick={() => setActiveTab(value)}
        >
            {children}
        </button>
    );
}

function TabsContent({ value, children, activeTab }: any) {
    if (activeTab !== value) return null;
    return <div className="mt-2">{children}</div>;
}

interface AgencyProfile {
    id: string;
    name: string;
    email: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
    wallet_locked: boolean;
    booking_locked: boolean;
    verification_status: string;
    wallet_balance: string;
    created_at: string;
}

export function AdminAgencyDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    // const navigate = useNavigate();

    // State
    const [agency, setAgency] = useState<AgencyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [notifySubject, setNotifySubject] = useState('');
    const [notifyMessage, setNotifyMessage] = useState('');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [kycOverrideNote, setKycOverrideNote] = useState('');

    const fetchProfile = async () => {
        try {
            const res = await apiFetch(`/api/admin/agencies/${id}/profile`);
            if (res.ok) {
                const data = await res.json();
                setAgency(data.agency);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            await apiFetch(`/api/admin/agencies/${id}/stats`);
            // stats endpoint called but payload is not bound to local state anymore
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [id]);

    useEffect(() => {
        if (agency) fetchStats();
    }, [agency]);

    // Removed console.log for production

    const handleStatusUpdate = async (newStatus: string) => {
        if (!confirm(`Change status to ${newStatus}?`)) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/admin/agencies/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            fetchProfile();
        } finally {
            setActionLoading(false);
        }
    };

    const handleLock = async (type: 'wallet' | 'booking', locked: boolean) => {
        if (!confirm(`${locked ? 'Lock' : 'Unlock'} ${type}?`)) return;
        setActionLoading(true);
        try {
            const endpoint = type === 'wallet' ? 'wallet-lock' : 'booking-lock';
            await apiFetch(`/api/admin/agencies/${id}/${endpoint}`, {
                method: 'PUT',
                body: JSON.stringify({ locked })
            });
            fetchProfile();
        } finally {
            setActionLoading(false);
        }
    };

    const handleForceLogout = async () => {
        if (!confirm('Force logout all users?')) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/admin/agencies/${id}/force-logout`, { method: 'POST' });
            alert('Users logged out');
        } finally {
            setActionLoading(false);
        }
    };

    const handleWalletAdjust = async (type: 'CREDIT' | 'DEBIT') => {
        if (!adjustAmount || !adjustReason) return alert('Amount and Reason required');
        if (!confirm(`${type} wallet by ${adjustAmount}?`)) return;

        setActionLoading(true);
        try {
            await apiFetch('/api/super/wallet/adjust', {
                method: 'POST',
                body: JSON.stringify({
                    agencyId: id,
                    type,
                    amount: parseFloat(adjustAmount),
                    reason: adjustReason
                })
            });
            setAdjustAmount('');
            setAdjustReason('');
            fetchProfile();
            alert('Wallet adjusted');
        } catch (err) {
            alert('Adjustment failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleKycOverride = async (status: 'VERIFIED' | 'REJECTED') => {
        if (!confirm(`Override KYC to ${status}?`)) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/super/agencies/${id}/kyc-override`, {
                method: 'PUT',
                body: JSON.stringify({ status, note: kycOverrideNote })
            });
            fetchProfile();
        } finally {
            setActionLoading(false);
        }
    };

    const handleNotify = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await apiFetch(`/api/admin/agencies/${id}/notify`, {
                method: 'POST',
                body: JSON.stringify({ subject: notifySubject, message: notifyMessage })
            });
            setNotifySubject('');
            setNotifyMessage('');
            alert('Notification sent');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!agency) return <div>Agency not found</div>;

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">{agency.name}</h1>
                    <div className="flex gap-2 mt-2">
                        <Badge variant={agency.status === 'ACTIVE' ? 'success' : 'destructive'} className={agency.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {agency.status}
                        </Badge>
                        <Badge variant="outline">{agency.verification_status}</Badge>
                        <Badge variant="outline">€{agency.wallet_balance}</Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleForceLogout} disabled={actionLoading}>
                        <LogOut className="w-4 h-4 mr-2" /> Force Logout
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="controls" className="w-full">
                <TabsList>
                    <TabsTrigger value="controls">Controls</TabsTrigger>
                    <TabsTrigger value="finance">Finance</TabsTrigger>
                    <TabsTrigger value="kyc">KYC & Docs</TabsTrigger>
                    <TabsTrigger value="comms">Communication</TabsTrigger>
                </TabsList>

                <TabsContent value="controls">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Account Status</CardTitle></CardHeader>
                            <CardContent className="flex gap-4">
                                <Button
                                    variant={agency.status === 'SUSPENDED' ? 'primary' : 'outline'}
                                    onClick={() => handleStatusUpdate(agency.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED')}
                                    disabled={actionLoading}
                                >
                                    {agency.status === 'SUSPENDED' ? 'Re-Activate' : 'Suspend'}
                                </Button>

                                {isSuperAdmin && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleStatusUpdate('BLOCKED')}
                                        disabled={actionLoading || agency.status === 'BLOCKED'}
                                    >
                                        Block Agency
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Operational Locks</CardTitle></CardHeader>
                            <CardContent className="flex gap-4">
                                <Button
                                    variant={agency.wallet_locked ? 'destructive' : 'outline'}
                                    onClick={() => handleLock('wallet', !agency.wallet_locked)}
                                    disabled={actionLoading}
                                >
                                    {agency.wallet_locked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                                    {agency.wallet_locked ? 'Unlock Wallet' : 'Lock Wallet'}
                                </Button>
                                <Button
                                    variant={agency.booking_locked ? 'destructive' : 'outline'}
                                    onClick={() => handleLock('booking', !agency.booking_locked)}
                                    disabled={actionLoading}
                                >
                                    {agency.booking_locked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                                    {agency.booking_locked ? 'Unlock Booking' : 'Lock Booking'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="finance">
                    <div className="space-y-4">
                        {isSuperAdmin && (
                            <Card>
                                <CardHeader><CardTitle>Manual Adjustment (Super Admin)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="Amount" type="number" value={adjustAmount} onChange={(e: any) => setAdjustAmount(e.target.value)} />
                                        <Input placeholder="Reason" value={adjustReason} onChange={(e: any) => setAdjustReason(e.target.value)} />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleWalletAdjust('CREDIT')} className="bg-green-600 hover:bg-green-700">Credit</Button>
                                        <Button onClick={() => handleWalletAdjust('DEBIT')} variant="destructive">Debit</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <Card>
                            <CardHeader><CardTitle>Ledger & Balance</CardTitle></CardHeader>
                            <CardContent>
                                <p>Wallet Balance: €{agency.wallet_balance}</p>
                                {/* Future: List ledger entries here */}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="kyc">
                    <div className="space-y-4">
                        {isSuperAdmin && (
                            <Card>
                                <CardHeader><CardTitle>Override Verification Status</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <Textarea placeholder="Admin Note for Override" value={kycOverrideNote} onChange={(e: any) => setKycOverrideNote(e.target.value)} />
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleKycOverride('VERIFIED')} className="bg-green-600">Force Verify</Button>
                                        <Button onClick={() => handleKycOverride('REJECTED')} variant="destructive">Force Reject</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <Card>
                            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
                            <CardContent>
                                <p>Status: {agency.verification_status}</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="comms">
                    <Card>
                        <CardHeader><CardTitle>Send Notification</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleNotify} className="space-y-4">
                                <Input placeholder="Subject" value={notifySubject} onChange={(e: any) => setNotifySubject(e.target.value)} required />
                                <Textarea placeholder="Message (HTML allowed)" value={notifyMessage} onChange={(e: any) => setNotifyMessage(e.target.value)} required />
                                <Button type="submit" disabled={actionLoading}><Mail className="w-4 h-4 mr-2" /> Send Email</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
