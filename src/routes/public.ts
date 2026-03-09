import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function publicRoutes(req: Request, path: string): Promise<Response> {
    const parts = path.split('/').filter(Boolean);

    // GET /public/pay/:id
    if (parts[1] === 'pay' && parts[2]) {
        const bookingId = parts[2];
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: { stripeSessionUrl: true }
        });

        if (!booking || !booking.stripeSessionUrl) {
            return Response.json({ error: 'Payment link not found or expired' }, { status: 404 });
        }

        return Response.json({ stripeSessionUrl: booking.stripeSessionUrl });
    }

    return new Response("Not Found", { status: 404 });
}
