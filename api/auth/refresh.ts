import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse, serialize } from 'cookie';
import { verifyRefreshToken, signToken } from '../../src/features/auth/jwt';
import { db } from '../../src/lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const refreshToken = cookies.refresh_token;

        if (!refreshToken) {
            return res.status(401).json({ error: 'No refresh token' });
        }

        // Verify format/signature
        const decoded = verifyRefreshToken(refreshToken) as { userId: string } | null;
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Verify against DB (check revocation)
        // Note: Repository findByToken might only return simple properties, but we need User Role.
        // We might need to extend repository or just fetch user separately.
        const savedToken = await db.refreshToken.findByToken(refreshToken);

        if (!savedToken || savedToken.revoked || savedToken.expires_at < new Date()) {
            return res.status(401).json({ error: 'Token expired or revoked' });
        }

        // Fetch User to get Role
        const user = await db.user.findById(savedToken.user_id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Issue new Access Token
        const newAccessToken = signToken({ userId: user.id, role: user.role });

        // Optional: Rotate Refresh Token (Strict security) - For now keep simple standard flow where RT stays valid until expiry/logout

        const accessTokenCookie = serialize('auth_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 mins
            path: '/',
        });

        res.setHeader('Set-Cookie', accessTokenCookie);

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
