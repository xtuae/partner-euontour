
import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';

export async function walletRoutes(req: Request, path: string, user: AuthUser) {
    requireRole(user, ['AGENCY']);
    const parts = path.split('/').filter(Boolean);
    // GET /wallet -> Balance
    if (req.method === 'GET' && parts.length === 1) {
        const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { agency_id: true } });
        if (!u?.agency_id) return Response.json({ error: 'No agency' }, { status: 403 });
        const a = await prisma.agency.findUnique({ where: { id: u.agency_id } });
        return Response.json({ balance: a?.wallet_balance || 0 });
    }

    // POST /wallet/topup/online -> Create Checkout Session
    if (req.method === 'POST' && parts.length === 3 && parts[1] === 'topup' && parts[2] === 'online') {
        const { amount } = await req.json();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return Response.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { agency_id: true } });
        if (!u?.agency_id) return Response.json({ error: 'Agency not found' }, { status: 400 });

        // Mock Checkout Session Return
        // In a real scenario, you'd create a Stripe/Razorpay session here
        const mockCheckoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/mock-checkout?amount=${numAmount}&agencyId=${u.agency_id}`;

        return Response.json({ checkoutUrl: mockCheckoutUrl }, { status: 200 });
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
}
