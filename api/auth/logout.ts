import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import { db } from '../../src/lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Clear Cookies
    const cookies = req.headers.cookie || '';
    const tokenRegex = /refresh_token=([^;]+)/;
    const match = cookies.match(tokenRegex);

    if (match && match[1]) {
        try {
            await db.refreshToken.revoke(match[1]);
        } catch (e) {
            console.error('Failed to revoke token:', e);
        }
    }

    const accessTokenCookie = serialize('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: -1,
        path: '/',
    });

    const refreshTokenCookie = serialize('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: -1,
        path: '/',
    });

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);

    return res.status(200).json({ success: true });
}
