import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../src/lib/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const tours = await prisma.tour.findMany({
            where: { active: true },
            orderBy: { name: 'asc' }
        });
        return res.status(200).json({ tours });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
