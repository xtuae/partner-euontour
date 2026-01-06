import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../src/lib/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'ADMIN' && userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const [
            totalWalletBalance,
            pendingAdminDeposits,
            pendingSuperAdminDeposits,
            credits30d,
            debits30d
        ] = await Promise.all([
            // 1. Total Wallet Balance
            prisma.agency.aggregate({
                _sum: { wallet_balance: true }
            }),
            // 2. Pending Admin Deps
            prisma.deposit.count({ where: { status: 'PENDING_ADMIN' } }),
            // 3. Pending Super Deps
            prisma.deposit.count({ where: { status: 'PENDING_SUPER_ADMIN' } }),
            // 4. Credits 30d
            prisma.walletLedger.aggregate({
                _sum: { amount: true },
                where: {
                    type: 'CREDIT',
                    created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            }),
            // 5. Debits 30d
            prisma.walletLedger.aggregate({
                _sum: { amount: true },
                where: {
                    type: 'DEBIT',
                    created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            })
        ]);

        return res.status(200).json({
            totalWalletBalance: totalWalletBalance._sum.wallet_balance || 0,
            pendingAdminDeposits,
            pendingSuperAdminDeposits,
            totalCredits30d: credits30d._sum.amount || 0,
            totalDebits30d: debits30d._sum.amount || 0
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
