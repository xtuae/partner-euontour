import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse } from 'cookie';
import { verifyToken } from '../../src/features/auth/jwt';
import { db } from '../../src/lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Parse Cookies
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Verify Token
        const decoded = verifyToken(token) as { userId: string } | null;
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch User
        const user = await db.user.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Sanitize
        const { password_hash, ...safeUser } = user as any;

        // Fetch agency if needed to return nested
        let agency = null;
        if (user.agency_id) {
            agency = await db.agency.findById(user.agency_id);
        }

        return res.status(200).json({ user: { ...safeUser, agency } });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
