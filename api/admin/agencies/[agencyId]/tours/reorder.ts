import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../../src/lib/auth.js';
import { prisma } from '../../../../../src/lib/db/prisma.js';
import { z } from 'zod';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { agencyId } = req.query;
    if (!agencyId || Array.isArray(agencyId)) return res.status(400).json({ error: 'Invalid Agency ID' });

    return reorderTours(req, res, agencyId, userToken);
}

const ReorderToursSchema = z.object({
    orderedTourIds: z.array(z.string().uuid())
});

// 4. Reorder Tours (Drag & Drop)
async function reorderTours(req: VercelRequest, res: VercelResponse, agencyId: string, userToken: { userId: string }) {
    try {
        const { orderedTourIds } = ReorderToursSchema.parse(req.body);

        await prisma.$transaction(async (tx: any) => {
            // Update sortOrder for each
            // This can be N queries or a complex CASE/WHEN update.
            // Since count is small (max 25-50 tours), N queries is probably fine but batching is better.
            // Prisma doesn't do "updateMany with different values" easily.
            // We can iterate.

            for (let i = 0; i < orderedTourIds.length; i++) {
                const tourId = orderedTourIds[i];
                // We only update existing assignments.
                await tx.agencyTour.updateMany({
                    where: { agencyId, tourId },
                    data: { sortOrder: i }
                });
            }

            await tx.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: 'REORDER_TOURS',
                    entity: 'AGENCY_TOURS',
                    entity_id: agencyId,
                }
            });
        });

        return res.status(200).json({ success: true, message: 'Tours reordered' });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
