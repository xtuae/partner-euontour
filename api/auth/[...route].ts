import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { parse, serialize } from 'cookie';
import { UserRole } from '../../src/lib/types.js';
import { db } from '../../src/lib/db/index.js';
import { prisma } from '../../src/lib/db/prisma.js';
import { loginSchema } from '../../src/lib/validators/auth.js';
import { signToken, signRefreshToken, verifyToken, verifyRefreshToken } from '../../src/lib/auth/jwt.js';
import { checkRateLimit } from '../../src/lib/rate-limit.js';
import { sendEmail } from '../../src/lib/email.js';


import { handleCors } from '../../src/lib/cors.js';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;

    const url = req.url || '';

    if (url.includes('/api/auth/login')) return login(req, res);
    if (url.includes('/api/auth/logout')) return logout(req, res);
    if (url.includes('/api/auth/refresh')) return refresh(req, res);
    if (url.includes('/api/auth/register')) return register(req, res);
    if (url.includes('/api/auth/me')) return me(req, res);
    if (url.includes('/api/auth/forgot-password')) return forgotPassword(req, res);
    if (url.includes('/api/auth/reset-password')) return resetPassword(req, res);

    return res.status(404).json({ error: 'Auth endpoint not found' });
}

// --- Handlers ---

async function login(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!checkRateLimit(req, 5, 60 * 1000)) return res.status(429).json({ error: 'Too many login attempts.' });

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    const { email, password } = parsed.data;

    try {
        const user = await db.user.findByEmail(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // Password check (simple mock bypass for dev, stricter in prod)
        // Note: In real prod, always use bcrypt.compare(password, user.password_hash)
        // If USE_MOCK_DB is true, we might allow simple check, but here we enforce consistent behavior
        // const match = await bcrypt.compare(password, user.password_hash);
        // For 'password123' and our hashes, bcrypt.compare should work if hash is valid.
        // However, seed/mock hashes might be consistent.

        // Phase 2 Hack: Allow simple password check if needed, but best to stick to bcrypt
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const accessToken = signToken({ userId: user.id, role: user.role });
        const refreshToken = signRefreshToken({ userId: user.id });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.refreshToken.create({
            token: refreshToken,
            user_id: user.id,
            expires_at: expiresAt
        });

        const accessTokenCookie = serialize('auth_token', accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60,
        });

        const refreshTokenCookie = serialize('refresh_token', refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60,
        });

        res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);

        let agency = null;
        if (user.agency_id) {
            agency = await db.agency.findById(user.agency_id);
        }

        return res.status(200).json({ success: true, user: { id: user.id, email: user.email, role: user.role, agency } });

    } catch (error: any) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
    }
}

async function logout(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
        ...COOKIE_OPTIONS,
        maxAge: -1,
    });

    const refreshTokenCookie = serialize('refresh_token', '', {
        ...COOKIE_OPTIONS,
        maxAge: -1,
    });

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
    return res.status(200).json({ success: true });
}

async function refresh(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const cookies = parse(req.headers.cookie || '');
        const refreshToken = cookies.refresh_token;

        if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

        const decoded = verifyRefreshToken(refreshToken) as { userId: string } | null;
        if (!decoded) return res.status(401).json({ error: 'Invalid refresh token' });

        const savedToken = await db.refreshToken.findByToken(refreshToken);

        if (!savedToken || savedToken.revoked || savedToken.expires_at < new Date()) {
            return res.status(401).json({ error: 'Token expired or revoked' });
        }

        const user = await db.user.findById(savedToken.user_id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const newAccessToken = signToken({ userId: user.id, role: user.role });

        const accessTokenCookie = serialize('auth_token', newAccessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60,
        });

        res.setHeader('Set-Cookie', accessTokenCookie);
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function me(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) return res.status(401).json({ error: 'Not authenticated' });

        const decoded = verifyToken(token) as { userId: string } | null;
        if (!decoded || !decoded.userId) return res.status(401).json({ error: 'Invalid token' });

        const user = await db.user.findById(decoded.userId);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const { password_hash, ...safeUser } = user as any;
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

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    agencyName: z.string().min(2),
});

async function register(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, password, agencyName } = RegisterSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const { user, refreshTokenRecord } = await prisma.$transaction(async (tx: any) => {
            const agency = await tx.agency.create({
                data: {
                    name: agencyName,
                    email: email,
                    verification_status: 'UNVERIFIED',
                },
            });

            const user = await tx.user.create({
                data: {
                    email,
                    password_hash: hashedPassword,
                    role: UserRole.AGENCY,
                    agency_id: agency.id
                },
                include: { agency: true }
            });

            const refreshToken = signRefreshToken({ userId: user.id });

            const refreshTokenRecord = await tx.refreshToken.create({
                data: {
                    token: refreshToken,
                    user_id: user.id,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            return { user, refreshTokenRecord };
        });

        const accessToken = signToken({ userId: user.id, role: user.role });

        const accessTokenCookie = serialize('auth_token', accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60,
        });

        const refreshTokenCookie = serialize('refresh_token', refreshTokenRecord.token, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60,
        });

        res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);

        return res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                agency: user.agency
            },
        });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const ForgotPasswordSchema = z.object({ email: z.string().email() });

async function forgotPassword(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email } = ForgotPasswordSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            const resetToken = crypto.randomUUID();
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await prisma.user.update({
                where: { email },
                data: { resetToken, resetTokenExpiry },
            });

            const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
            await sendEmail({
                to: email,
                subject: 'Reset your password',
                body: `<p>Click here to reset your password: <a href="${resetLink}">Reset Link</a></p>`,
            });
        }

        return res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const ResetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(8),
});

async function resetPassword(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { token, password } = ResetPasswordSchema.parse(req.body);

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() },
            },
        });

        if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        await prisma.refreshToken.updateMany({
            where: { user_id: user.id },
            data: { revoked: true },
        });

        return res.status(200).json({ success: true, message: 'Password reset successful' });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
