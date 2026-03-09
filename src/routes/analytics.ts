import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';

export async function analyticsRoutes(req: Request, path: string, user: AuthUser) {
    // Only accessible to SUPER_ADMIN
    requireRole(user, ['SUPER_ADMIN']);
    const parts = path.split('/').filter(Boolean);

    // GET /api/analytics/kpis
    if (parts.length === 2 && parts[1] === 'kpis' && req.method === 'GET') {
        const [revenueAgg, liabilitiesAgg, bookingCount, pendingDepositsCount] = await Promise.all([
            prisma.booking.aggregate({
                _sum: { amount: true },
                where: { status: 'CONFIRMED' }
            }),
            prisma.agency.aggregate({
                _sum: { wallet_balance: true }
            }),
            prisma.booking.count({
                where: { status: 'CONFIRMED' }
            }),
            prisma.deposit.count({
                where: { status: 'PENDING_ADMIN' }
            })
        ]);

        return Response.json({
            totalRevenue: Number(revenueAgg._sum.amount || 0),
            totalLiabilities: Number(liabilitiesAgg._sum.wallet_balance || 0),
            bookingCount,
            pendingDepositsCount
        });
    }

    // GET /api/analytics/revenue
    if (parts.length === 2 && parts[1] === 'revenue' && req.method === 'GET') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const bookings = await prisma.booking.findMany({
            where: {
                status: 'CONFIRMED',
                created_at: { gte: thirtyDaysAgo }
            },
            select: {
                amount: true,
                created_at: true
            },
            orderBy: { created_at: 'asc' }
        });

        const dailyMap = new Map<string, { revenue: number; count: number }>();

        // Initialize last 30 days to 0 to ensure continuous line chart
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyMap.set(dateStr, { revenue: 0, count: 0 });
        }

        for (const b of bookings) {
            const dateStr = new Date(b.created_at).toISOString().split('T')[0];
            const current = dailyMap.get(dateStr) || { revenue: 0, count: 0 };
            dailyMap.set(dateStr, {
                revenue: current.revenue + Number(b.amount),
                count: current.count + 1
            });
        }

        const data = Array.from(dailyMap.entries()).map(([date, stats]) => ({
            date,
            revenue: stats.revenue,
            count: stats.count
        }));

        return Response.json({ revenueOverTime: data });
    }

    // GET /api/analytics/top-performers
    if (parts.length === 2 && parts[1] === 'top-performers' && req.method === 'GET') {
        const [topAgenciesGroup, topToursGroup] = await Promise.all([
            prisma.booking.groupBy({
                by: ['agency_id'],
                _sum: { amount: true },
                where: { status: 'CONFIRMED' },
                orderBy: { _sum: { amount: 'desc' } },
                take: 5
            }),
            prisma.booking.groupBy({
                by: ['tour_id'],
                _count: { id: true },
                where: { status: 'CONFIRMED' },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            })
        ]);

        const agencyIds = topAgenciesGroup.map(g => g.agency_id);
        const tourIds = topToursGroup.map(g => g.tour_id);

        const [agencies, tours] = await Promise.all([
            prisma.agency.findMany({
                where: { id: { in: agencyIds } },
                select: { id: true, name: true }
            }),
            prisma.tour.findMany({
                where: { id: { in: tourIds } },
                select: { id: true, name: true }
            })
        ]);

        const topAgencies = topAgenciesGroup.map(g => ({
            id: g.agency_id,
            name: agencies.find(a => a.id === g.agency_id)?.name || 'Unknown',
            spent: Number(g._sum.amount || 0)
        }));

        const topTours = topToursGroup.map(g => ({
            id: g.tour_id,
            name: tours.find(t => t.id === g.tour_id)?.name || 'Unknown',
            bookings: g._count.id
        }));

        return Response.json({ topAgencies, topTours });
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });
}
