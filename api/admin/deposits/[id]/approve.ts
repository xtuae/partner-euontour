import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../_middleware/auth.js';

async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    return res.status(410).json({ error: 'Endpoint Deprecated. Use Super Admin Approval workflow.' });
}

export default requireAuth(handler);
