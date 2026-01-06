import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { agencyId } = req.query;
    if (!agencyId || Array.isArray(agencyId)) return res.status(400).json({ error: 'Invalid Agency ID' });

    try {
        // Fetch 360 Agnecy Data
        const [agency, stats, auditLogs, bookings, deposits] = await Promise.all([
            // 1. Agency Details with Wallet/KYC
            prisma.agency.findUnique({
                where: { id: agencyId },
                include: {
                    owner_kyc: { orderBy: { createdAt: 'desc' }, take: 1 },
                    documents: true,
                    // agency_tours: { include: { tour: true } } // Fetch active tour assigments separately if large
                    agency_tours: {
                        include: { tour: true },
                        orderBy: { sortOrder: 'asc' }
                    }
                }
            }),
            // 2. Booking Stats (Aggregated)
            prisma.booking.groupBy({
                by: ['status'],
                where: { agency_id: agencyId },
                _count: true,
                _sum: { amount: true }
            }),
            // 3. Recent Audit Logs
            prisma.auditLog.findMany({
                where: { OR: [{ entity_id: agencyId }, { entity: 'AGENCY_WALLET', entity_id: agencyId }] }, // Broaden search?
                orderBy: { created_at: 'desc' },
                take: 20,
                include: { actor: { select: { email: true, role: true } } }
            }),
            // 4. Recent Bookings
            prisma.booking.findMany({
                where: { agency_id: agencyId },
                orderBy: { created_at: 'desc' },
                take: 10
            }),
            // 5. Recent Deposits
            prisma.deposit.findMany({
                where: { agency_id: agencyId },
                orderBy: { created_at: 'desc' },
                take: 10
            })
        ]);

        if (!agency) return res.status(404).json({ error: 'Agency not found' });

        return res.status(200).json({
            agency,
            stats,
            auditLogs,
            bookings,
            deposits
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
