import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { agencyId } = req.query;
    if (!agencyId || Array.isArray(agencyId)) return res.status(400).json({ error: 'Invalid Agency ID' });

    try {
        // Find users for this agency
        const users = await prisma.user.findMany({
            where: { agency_id: agencyId },
            select: { id: true }
        });

        const userIds = users.map(u => u.id);

        if (userIds.length > 0) {
            await prisma.$transaction(async (tx: any) => {
                // Revoke/Delete all refresh tokens for these users
                await tx.refreshToken.deleteMany({
                    where: { user_id: { in: userIds } }
                });

                await tx.auditLog.create({
                    data: {
                        actor_id: userToken.userId,
                        action: 'AGENCY_FORCE_LOGOUT',
                        entity: 'AGENCY',
                        entity_id: agencyId
                    }
                });
            });
        }

        return res.status(200).json({ success: true, message: 'Agency sessions terminated' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
