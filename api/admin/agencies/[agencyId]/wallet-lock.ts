import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';
import { z } from 'zod';

const LockSchema = z.object({
    locked: z.boolean(),
    reason: z.string().optional()
});

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { agencyId } = req.query;
    if (!agencyId || Array.isArray(agencyId)) return res.status(400).json({ error: 'Invalid Agency ID' });

    try {
        const { locked, reason } = LockSchema.parse(req.body);

        await prisma.$transaction(async (tx: any) => {
            await tx.agency.update({
                where: { id: agencyId },
                data: { wallet_locked: locked }
            });

            await tx.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: locked ? 'WALLET_LOCKED' : 'WALLET_UNLOCKED',
                    entity: 'AGENCY_WALLET',
                    entity_id: agencyId,
                }
            });
        });

        return res.status(200).json({ success: true, message: `Wallet ${locked ? 'locked' : 'unlocked'}` });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
