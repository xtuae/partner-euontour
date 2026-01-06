import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../src/lib/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'AGENCY') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userToken.userId },
            select: { agency_id: true }
        });

        if (!user || !user.agency_id) {
            return res.status(400).json({ error: 'Agency profile not found' });
        }

        const agencyTours = await prisma.agencyTour.findMany({
            where: {
                agencyId: user.agency_id,
                isActive: true,
                tour: { active: true } // Ensure master tour is also active
            },
            include: {
                tour: true
            },
            orderBy: {
                sortOrder: 'asc'
            }
        });

        // Map to flat tour objects for frontend consistency, or return as is?
        // Usually frontend expects a list of tours.
        const tours = agencyTours.map((at: any) => ({
            ...at.tour,
            // We could add assignment metadata if needed
            // assignmentId: at.id
        }));

        return res.status(200).json({ tours });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
