import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../src/lib/db';
import { requireAuth } from '../_middleware/auth';

const handler = async (req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const agencyUser = await db.user.findById(user.userId);

        if (!agencyUser || (user.role === 'AGENCY' && !agencyUser.agency_id)) {
            return res.status(403).json({ error: 'Agency not found' });
        }

        const agencyId = agencyUser.agency_id;
        if (!agencyId) return res.status(404).json({ error: 'No associated agency' });

        const balance = await db.wallet.getBalance(agencyId);

        // Mock Ledger History (Repository doesn't have getHistory yet, let's skip or add it)
        // For now, return empty or implement getHistory in Repo
        const ledger: any[] = [];

        return res.status(200).json({ balance, ledger });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
