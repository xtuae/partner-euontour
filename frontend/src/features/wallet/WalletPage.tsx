import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Badge } from '../../app/components/ui/Badge';
import { Button } from '../../app/components/ui/Button';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LedgerEntry {
    id: string;
    amount: string;
    type: string;
    description: string;
    created_at: string;
}

interface DepositEntry {
    id: string;
    amount: string;
    status: string;
    created_at: string;
    rejectionReason?: string;
}

export function WalletPage() {
    const [balance, setBalance] = useState<number | null>(null);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [deposits, setDeposits] = useState<DepositEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/api/wallet/balance')
            .then(res => res.json())
            .then(data => {
                setBalance(Number(data.balance));
                setLedger(data.ledger || []);
                setDeposits(data.deposits || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8">Loading wallet...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-brand-black">My Wallet</h1>
                <Link to="/wallet/deposit">
                    <Button className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" /> Deposit Funds
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Current Balance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-brand-black">
                        €{(balance || 0).toFixed(2)}
                    </div>
                    <p className="text-gray-500 mt-1">Available for new bookings</p>
                </CardContent>
            </Card>

            <h2 className="text-xl font-semibold mt-8 mb-4">Recent Transactions</h2>
            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {ledger.map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {new Date(entry.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {entry.description}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant={entry.type === 'CREDIT' ? 'success' : 'default'}>
                                        {entry.type}
                                    </Badge>
                                </td>
                                <td className={`px-6 py-4 text-sm font-bold text-right ${entry.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {entry.type === 'CREDIT' ? '+' : '-'}€{Number(entry.amount).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {ledger.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    No transactions yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Deposits Section */}
            <h2 className="text-xl font-semibold mt-12 mb-4">Pending & Past Top-Ups</h2>
            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {deposits.map((dep) => (
                            <tr key={dep.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {new Date(dep.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                    €{Number(dep.amount).toFixed(2)}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant={
                                        dep.status === 'APPROVED' ? 'success' :
                                            dep.status === 'REJECTED' ? 'destructive' : 'default'
                                    }>
                                        {dep.status}
                                    </Badge>
                                    {dep.status === 'REJECTED' && dep.rejectionReason && (
                                        <div className="text-xs text-red-600 mt-1 max-w-xs">{dep.rejectionReason}</div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {deposits.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                    No deposit requests found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
