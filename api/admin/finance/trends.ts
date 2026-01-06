import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../src/lib/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'ADMIN' && userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        // Get last 6 months trends
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1); // Start of month

        const ledger = await prisma.walletLedger.findMany({
            where: {
                created_at: { gte: sixMonthsAgo }
            },
            select: {
                created_at: true,
                type: true,
                amount: true
            }
        });

        // Group by Month (YYYY-MM)
        const trends = ledger.reduce((acc: any, entry: any) => {
            const month = entry.created_at.toISOString().slice(0, 7); // YYYY-MM
            if (!acc[month]) acc[month] = { month, credit: 0, debit: 0 };

            if (entry.type === 'CREDIT') {
                acc[month].credit += Number(entry.amount);
            } else {
                acc[month].debit += Number(entry.amount);
            }
            return acc;
        }, {} as Record<string, { month: string, credit: number, debit: number }>);

        // Sort by month
        const result = Object.values(trends).sort((a: any, b: any) => a.month.localeCompare(b.month));

        return res.status(200).json(result);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
