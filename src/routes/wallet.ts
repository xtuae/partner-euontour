
import { prisma } from '@/lib/db/prisma.js';
import { AuthUser, requireRole } from '@/lib/auth.js';

export async function walletRoutes(req: Request, path: string, user: AuthUser) {
    requireRole(user, ['AGENCY']);
    // GET /wallet -> Balance
    if (req.method === 'GET') {
        const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { agency_id: true } });
        if (!u?.agency_id) return Response.json({ error: 'No agency' }, { status: 403 });
        const a = await prisma.agency.findUnique({ where: { id: u.agency_id } });
        return Response.json({ balance: a?.wallet_balance || 0 });
    }
    return Response.json({ error: 'Not Found' }, { status: 404 });
}
