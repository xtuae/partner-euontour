import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../src/lib/db';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole, DepositStatus } from '../../../src/lib/types';
import { parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const payload = verifyToken(token) as { userId: string, role: string } | null;
        if (!payload || (payload.role !== UserRole.ADMIN && payload.role !== UserRole.SUPER_ADMIN)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const deposits = await db.deposit.findAll();
        const pendingDeposits = deposits.filter(d => d.status === DepositStatus.PENDING);

        // Enrich with Agency Name (Mock)
        const enrichedDeposits = await Promise.all(pendingDeposits.map(async (d) => {
            const agency = await db.agency.findById(d.agency_id);
            return { ...d, agency: { name: agency?.name || 'Unknown' } };
        }));

        return res.status(200).json({ deposits: enrichedDeposits });

        return res.status(200).json({ deposits });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
