import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { prisma } from '../../../src/lib/db/prisma';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole } from '@prisma/client';
import { parse } from 'cookie';
import { logAudit } from '../../../src/lib/audit';
import bcrypt from 'bcryptjs';

const CreateAdminSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = verifyToken(token) as { userId: string, role: string } | null;
        if (!payload || payload.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({ error: 'Forbidden. Super Admin only.' });
        }

        const { email, password, role } = CreateAdminSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password_hash: hashedPassword,
                role: role === 'SUPER_ADMIN' ? UserRole.SUPER_ADMIN : UserRole.ADMIN,
            }
        });

        // Audit Log
        logAudit({
            actorId: payload.userId,
            action: 'ADMIN_CREATE',
            entity: 'USER',
            entityId: newUser.id,
            ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
        });

        return res.status(201).json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
