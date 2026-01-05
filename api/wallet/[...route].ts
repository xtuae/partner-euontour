import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../src/lib/db/index.js';
import { requireAuth } from '../_middleware/auth.js';
import { handleCors } from '../../src/lib/cors.js';


async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    await handleCors(req, res);
    // Router for wallet. Currently only balance.
    // If we add ledger, we can route here.
    // Default to balance if path is root /api/wallet or /api/wallet/balance

    // Logic: verify if it's balance or ledger
    // Since original was /api/wallet/balance.ts -> /api/wallet/balance
    // New: /api/wallet.ts -> /api/wallet/balance

    const url = req.url || '';
    if (url.includes('/api/wallet/balance') || url.endsWith('/api/wallet')) return getBalance(req, res, user);

    return res.status(404).json({ error: 'Endpoint not found' });
}

async function getBalance(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const agencyUser = await db.user.findById(user.userId);

        if (!agencyUser || (user.role === 'AGENCY' && !agencyUser.agency_id)) {
            return res.status(403).json({ error: 'Agency not found' });
        }

        const agencyId = agencyUser.agency_id;
        if (!agencyId) return res.status(404).json({ error: 'No associated agency' });

        const balance = await db.wallet.getBalance(agencyId);

        // Mock Ledger History (Repository doesn't have getHistory yet, let's skip or add it)
        const ledger: any[] = [];

        return res.status(200).json({ balance, ledger });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
