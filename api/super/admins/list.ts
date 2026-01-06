import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const admins = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'SUPER_ADMIN'] }
            },
            select: {
                id: true,
                email: true,
                role: true,
                last_login: true,
                created_at: true
            }
        });

        return res.status(200).json({ admins });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
