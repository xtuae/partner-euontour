import { z } from 'zod';
import { prisma } from '../lib/db/prisma.js';
import { UserRole } from '../lib/types.js';

export async function settingsRoutes(req: Request, path: string, user: any) {
    if (path === '/settings/agency' && req.method === 'PUT') return updateAgencySettings(req, user);
    if (path === '/settings/super' && req.method === 'PUT') return updateSuperSettings(req, user);

    return new Response('Settings endpoint not found', { status: 404 });
}

function jsonResponse(data: any, status = 200, headers: HeadersInit = {}) {
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function errorResponse(error: string, status = 400) {
    return jsonResponse({ error }, status);
}

async function updateAgencySettings(req: Request, user: any) {
    if (user.role !== UserRole.AGENCY) return errorResponse('Forbidden', 403);

    try {
        const body = await req.json();
        const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
        if (!dbUser?.agency_id) return errorResponse('Agency not found', 404);

        const updated = await prisma.agency.update({
            where: { id: dbUser.agency_id },
            data: {
                name: body.name || undefined
            }
        });
        return jsonResponse({ success: true, agency: updated });
    } catch (e) {
        return errorResponse('Server Error', 500);
    }
}

async function updateSuperSettings(req: Request, user: any) {
    if (user.role !== UserRole.SUPER_ADMIN) return errorResponse('Forbidden', 403);
    // Stub for super admin global settings toggle
    return jsonResponse({ success: true, message: 'Super settings updated' });
}
