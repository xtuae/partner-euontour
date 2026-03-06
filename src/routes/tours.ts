import { prisma } from '../lib/db/prisma.js';
import { AuthUser } from '../lib/auth.js';

export async function toursRoutes(req: Request, path: string, user: AuthUser) {
    if (path === '/tours' && req.method === 'GET') {
        // Return all active tours for agencies
        const tours = await prisma.tour.findMany({
            where: { active: true },
            orderBy: { name: 'asc' }
        });
        return Response.json({ tours });
    }

    return new Response("Not Found", { status: 404 });
}
