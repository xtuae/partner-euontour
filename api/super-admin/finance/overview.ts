import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../src/lib/db/prisma';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole, LedgerType, BookingStatus, DepositStatus } from '@prisma/client';
import { parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = verifyToken(token) as { userId: string, role: string } | null;
        if (!payload || payload.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({ error: 'Forbidden. Super Admin only.' });
        }

        // 1. Total Agency Balances (Liabilities)
        const creditSum = await prisma.walletLedger.aggregate({
            where: { type: LedgerType.CREDIT },
            _sum: { amount: true }
        });
        const debitSum = await prisma.walletLedger.aggregate({
            where: { type: LedgerType.DEBIT },
            _sum: { amount: true }
        });

        const totalLiabilities = (Number(creditSum._sum.amount) || 0) - (Number(debitSum._sum.amount) || 0);

        // 2. Total Revenue (Confirmed Bookings)
        const revenue = await prisma.booking.aggregate({
            where: { status: BookingStatus.CONFIRMED },
            _sum: { amount: true }
        });

        // 3. Pending Deposits
        const pendingDeposits = await prisma.deposit.count({
            where: { status: DepositStatus.PENDING }
        });

        // 4. Counts
        const totalAgencies = await prisma.agency.count();
        const totalUsers = await prisma.user.count();

        return res.status(200).json({
            liabilities: totalLiabilities,
            revenue: Number(revenue._sum.amount) || 0,
            pendingDeposits,
            totalAgencies,
            totalUsers
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
