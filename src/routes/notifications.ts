import { prisma } from '../lib/db/prisma.js';
import { AuthUser } from '../lib/auth.js';

export async function notificationsRoutes(req: Request, path: string, user: AuthUser) {
    const parts = path.split('/').filter(Boolean); // ["notifications", "id", "read"]

    if (req.method === 'GET' && parts.length === 1) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
        const agencyId = dbUser?.agency_id;

        const OR_CONDITIONS: any[] = [{ userId: user.userId }];
        if (agencyId) {
            OR_CONDITIONS.push({ agencyId: agencyId });
        }

        const notifications = await prisma.notification.findMany({
            where: { OR: OR_CONDITIONS },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return Response.json({ notifications });
    }

    if (req.method === 'PUT' && parts.length === 3 && parts[2] === 'read') {
        const id = parts[1];
        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        return Response.json({ success: true });
    }

    return new Response('Not Found', { status: 404 });
}
