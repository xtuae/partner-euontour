
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { parse, serialize } from 'cookie';
import crypto from 'crypto';
import { UserRole } from '../lib/types.js';
import { db } from '../lib/db/index.js';
import { prisma } from '../lib/db/prisma.js';
import { loginSchema } from '../lib/validators/auth.js';
import { signToken, signRefreshToken, verifyToken, verifyRefreshToken } from '../lib/auth/jwt.js';
import { checkRateLimit } from '../lib/rate-limit.js';
import { sendEmail, EMAIL_TEMPLATES } from '../lib/email.js';

const isProd = process.env.NODE_ENV === 'production';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://partners.euontour.com';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' as const : 'lax' as const,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined
};

// Schemas
const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    agencyName: z.string().min(2),
});

const ForgotPasswordSchema = z.object({ email: z.string().email() });
const ResetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8) });

export async function authRoutes(req: Request, path: string) {
    // path is relative to /api, e.g. /auth/login
    // But index.ts strips /api. So path starts with /auth.
    // Let's assume path passed from index is "/auth/login".

    if (path === '/auth/login' && req.method === 'POST') return login(req);
    if (path === '/auth/logout' && req.method === 'POST') return logout(req);
    if (path === '/auth/refresh' && req.method === 'POST') return refresh(req);
    if (path === '/auth/register' && req.method === 'POST') return register(req);
    if (path === '/auth/me' && req.method === 'GET') return me(req);
    if (path === '/auth/forgot-password' && req.method === 'POST') return forgotPassword(req);
    if (path === '/auth/reset-password' && req.method === 'POST') return resetPassword(req);
    if (path.startsWith('/auth/verify-email') && req.method === 'GET') return verifyEmail(req);

    return new Response('Auth endpoint not found', { status: 404 });
}

// Helpers
function jsonResponse(data: any, status = 200, headers: HeadersInit = {}) {
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function errorResponse(error: string, status = 400) {
    return jsonResponse({ error }, status);
}

// Handlers

async function login(req: Request) {
    // Rate Limit? Adapting checkRateLimit to Request object if needed
    // Assuming checkRateLimit works with IP. Req object might not have IP easily in non-Edge?
    // request.headers.get('x-forwarded-for')
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    // Mocking checks for now if lib is incompatible. checking lib next step.

    try {
        const body = await req.json();
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) return jsonResponse({ error: parsed.error.issues }, 400);

        const { email, password } = parsed.data;
        const user = await db.user.findByEmail(email);
        if (!user) return errorResponse('Invalid credentials', 401);

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return errorResponse('Invalid credentials', 401);

        const accessToken = signToken({ userId: user.id, role: user.role });
        const refreshToken = signRefreshToken({ userId: user.id });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.refreshToken.create({ token: refreshToken, user_id: user.id, expires_at: expiresAt });

        const headers = new Headers();
        headers.append('Set-Cookie', serialize('auth_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 }));
        headers.append('Set-Cookie', serialize('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 }));

        let agency = null;
        if (user.agency_id) agency = await db.agency.findById(user.agency_id);

        return jsonResponse({ success: true, user: { id: user.id, email: user.email, role: user.role, agency } }, 200, headers);

    } catch (e: any) {
        console.error(e);
        return errorResponse(e.message || 'Server Error', 500);
    }
}

async function logout(req: Request) {
    const cookieHeader = req.headers.get('Cookie') || '';
    const match = cookieHeader.match(/refresh_token=([^;]+)/);
    if (match && match[1]) {
        try { await db.refreshToken.revoke(match[1]); } catch (e) { console.error(e); }
    }

    const headers = new Headers();
    headers.append('Set-Cookie', serialize('auth_token', '', { ...COOKIE_OPTIONS, maxAge: -1 }));
    headers.append('Set-Cookie', serialize('refresh_token', '', { ...COOKIE_OPTIONS, maxAge: -1 }));

    return jsonResponse({ success: true }, 200, headers);
}

async function refresh(req: Request) {
    const cookieHeader = req.headers.get('Cookie') || '';
    const cookies = parse(cookieHeader);
    const refreshToken = cookies.refresh_token;

    if (!refreshToken) return errorResponse('No refresh token', 401);

    try {
        const decoded = verifyRefreshToken(refreshToken) as { userId: string, role?: string } | null;
        if (!decoded) return errorResponse('Invalid refresh token', 401);

        const savedToken = await db.refreshToken.findByToken(refreshToken);
        if (!savedToken || savedToken.revoked || savedToken.expires_at < new Date()) {
            return errorResponse('Token expired or revoked', 401);
        }

        const user = await db.user.findById(savedToken.user_id);
        if (!user) return errorResponse('User not found', 401);

        const newAccessToken = signToken({ userId: user.id, role: user.role });
        const headers = new Headers();
        headers.append('Set-Cookie', serialize('auth_token', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 }));

        return jsonResponse({ success: true }, 200, headers);
    } catch (e) {
        return errorResponse('Server Error', 500);
    }
}

async function me(req: Request) {
    const cookieHeader = req.headers.get('Cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.auth_token;

    if (!token) return errorResponse('Not authenticated', 401);

    try {
        const decoded = verifyToken(token) as { userId: string } | null;
        if (!decoded) return errorResponse('Invalid token', 401);

        const user = await db.user.findById(decoded.userId);
        if (!user) return errorResponse('User not found', 401);

        const { password_hash, ...safeUser } = user as any;
        let agency = null;
        if (user.agency_id) agency = await db.agency.findById(user.agency_id);

        return jsonResponse({ user: { ...safeUser, agency } });
    } catch (e) {
        return errorResponse('Server Error', 500);
    }
}

async function register(req: Request) {
    try {
        const body = await req.json();
        const { email, password, agencyName } = RegisterSchema.parse(body);

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return errorResponse('Email already registered');

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomUUID();

        const result = await prisma.$transaction(async (tx: any) => {
            const agency = await tx.agency.create({
                data: { name: agencyName, email, verification_status: 'UNVERIFIED' }
            });
            const user = await tx.user.create({
                data: {
                    email, password_hash: hashedPassword, role: UserRole.AGENCY,
                    agency_id: agency.id, verification_token: verificationToken,
                    verification_token_expiry: new Date(Date.now() + 86400000)
                },
                include: { agency: true }
            });
            const refreshToken = signRefreshToken({ userId: user.id });
            const rtRecord = await tx.refreshToken.create({
                data: { token: refreshToken, user_id: user.id, expires_at: new Date(Date.now() + 7 * 86400000) }
            });
            return { user, rtRecord };
        });

        const verifyLink = `${APP_URL}/verify-email?token=${verificationToken}`;
        await sendEmail({ to: email, ...EMAIL_TEMPLATES.VERIFY_EMAIL(agencyName, verifyLink) });

        const accessToken = signToken({ userId: result.user.id, role: result.user.role });

        const headers = new Headers();
        headers.append('Set-Cookie', serialize('auth_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 900 }));
        headers.append('Set-Cookie', serialize('refresh_token', result.rtRecord.token, { ...COOKIE_OPTIONS, maxAge: 604800 }));

        return jsonResponse({
            user: { id: result.user.id, email: result.user.email, role: result.user.role, agency: result.user.agency }
        }, 201, headers);

    } catch (e: any) {
        if (e instanceof z.ZodError) return jsonResponse({ error: e.issues }, 400);
        console.error(e);
        return errorResponse('Server Error', 500);
    }
}

async function forgotPassword(req: Request) {
    try {
        const body = await req.json();
        const { email } = ForgotPasswordSchema.parse(body);
        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            const resetToken = crypto.randomUUID();
            await prisma.user.update({
                where: { email },
                data: { resetToken, resetTokenExpiry: new Date(Date.now() + 3600000) }
            });
            const link = `${APP_URL}/reset-password?token=${resetToken}`;
            await sendEmail({ to: email, subject: 'Reset Password', body: `<a href="${link}">Reset Link</a>` });
        }
        return jsonResponse({ success: true, message: 'If account exists, link sent' });
    } catch (e: any) {
        if (e instanceof z.ZodError) return jsonResponse({ error: e.issues }, 400);
        return errorResponse('Server Error', 500);
    }
}

async function resetPassword(req: Request) {
    try {
        const body = await req.json();
        const { token, password } = ResetPasswordSchema.parse(body);
        const user = await prisma.user.findFirst({
            where: { resetToken: token, resetTokenExpiry: { gt: new Date() } }
        });
        if (!user) return errorResponse('Invalid token');

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password_hash: hashedPassword, resetToken: null, resetTokenExpiry: null }
        });
        await prisma.refreshToken.updateMany({ where: { user_id: user.id }, data: { revoked: true } });

        return jsonResponse({ success: true });
    } catch (e: any) {
        if (e instanceof z.ZodError) return jsonResponse({ error: e.issues }, 400);
        return errorResponse('Server Error', 500);
    }
}

async function verifyEmail(req: Request) {
    // GET /auth/verify-email?token=...
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return errorResponse('Token required');

    try {
        const user = await prisma.user.findFirst({
            where: { verification_token: token, verification_token_expiry: { gt: new Date() } }
        });
        if (!user) return errorResponse('Invalid token');

        await prisma.user.update({
            where: { id: user.id },
            data: { email_verified: true, verification_token: null, verification_token_expiry: null }
        });
        return jsonResponse({ success: true, message: 'Email verified' });
    } catch (e) {
        return errorResponse('Server Error', 500);
    }
}
