import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole } from '../../../src/lib/types';
import { parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = verifyToken(token) as { userId: string, role: string } | null;
        if (!payload || (payload.role !== UserRole.ADMIN && payload.role !== UserRole.SUPER_ADMIN)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const logs: any[] = []; // Mock empty logs
        /*
        const logs = await prisma.auditLog.findMany({
            orderBy: { created_at: 'desc' },
            take: 50,
            include: {
                actor: {
                    select: { email: true, role: true }
                }
            }
        });
        */

        return res.status(200).json({ logs });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
