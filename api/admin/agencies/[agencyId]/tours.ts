import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';
import { z } from 'zod';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { agencyId } = req.query;
    if (!agencyId || Array.isArray(agencyId)) return res.status(400).json({ error: 'Invalid Agency ID' });

    if (req.method === 'GET') return getAssignedTours(req, res, agencyId);
    if (req.method === 'PUT') return updateAssignedTours(req, res, agencyId, userToken);

    return res.status(405).json({ error: 'Method not allowed' });
}

// 2. Get Assigned Tours for an Agency
async function getAssignedTours(req: VercelRequest, res: VercelResponse, agencyId: string) {
    try {
        const assignments = await prisma.agencyTour.findMany({
            where: { agencyId },
            include: { tour: true },
            orderBy: { sortOrder: 'asc' }
        });
        return res.status(200).json({ assignments });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const UpdateToursSchema = z.object({
    tourIds: z.array(z.string().uuid())
});

// 3. Assign / Update Tours for Agency (BULK)
async function updateAssignedTours(req: VercelRequest, res: VercelResponse, agencyId: string, userToken: { userId: string }) {
    try {
        const { tourIds } = UpdateToursSchema.parse(req.body);

        await prisma.$transaction(async (tx: any) => {
            // 1. Remove old assignments NOT in the new list (Optional: or DELETE ALL and RE-INSERT)
            // Strategy: Delete all and re-insert is easiest for bulk replacement and ordering.
            // But we might want to preserve isActive if we had it (though prompt says payload is just IDs).
            // Prompt says: "Assign / Update Tours... Remove old assignments... Insert new assignments... Assign sortOrder based on array order"

            await tx.agencyTour.deleteMany({
                where: { agencyId }
            });

            // 2. Insert new
            if (tourIds.length > 0) {
                await tx.agencyTour.createMany({
                    data: tourIds.map((tourId, index) => ({
                        agencyId,
                        tourId,
                        sortOrder: index,
                        isActive: true
                    }))
                });
            }

            // 3. Audit Log
            await tx.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: 'ASSIGN_TOURS',
                    entity: 'AGENCY_TOURS',
                    entity_id: agencyId,
                    // Store details as JSON string in a generic field if schema supported it, or just log interaction.
                    // Schema has action, entity, entity_id. 
                }
            });
        });

        return res.status(200).json({ success: true, message: 'Tours assigned successfully' });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
