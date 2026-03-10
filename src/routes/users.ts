import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db/prisma.js';
import { UserRole } from '../lib/types.js';

const ProfileSchema = z.object({
    name: z.string().optional(),
    profilePicture: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional()
});

export async function usersRoutes(req: Request, path: string, user: any) {
    if (path === '/users/profile' && req.method === 'PUT') return updateProfile(req, user);

    return new Response('Users endpoint not found', { status: 404 });
}

function jsonResponse(data: any, status = 200, headers: HeadersInit = {}) {
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function errorResponse(error: string, status = 400) {
    return jsonResponse({ error }, status);
}

async function updateProfile(req: Request, user: any) {
    try {
        const body = await req.json();
        const parsed = ProfileSchema.safeParse(body);
        if (!parsed.success) return jsonResponse({ error: parsed.error.issues }, 400);

        const { name, profilePicture, currentPassword, newPassword } = parsed.data;

        const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
        if (!dbUser) return errorResponse('User not found', 404);

        const updateData: any = {};
        if (name) updateData.name = name;
        if (profilePicture) updateData.profilePicture = profilePicture;

        if (currentPassword && newPassword) {
            const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
            if (!isValid) return errorResponse('Current password incorrect', 400);

            updateData.password_hash = await bcrypt.hash(newPassword, 10);
        }

        const updated = await prisma.user.update({
            where: { id: user.userId },
            data: updateData,
            select: { id: true, name: true, profilePicture: true, email: true, role: true }
        });

        return jsonResponse({ success: true, user: updated });
    } catch (e: any) {
        console.error('Update profile error:', e);
        return errorResponse('Server Error', 500);
    }
}
