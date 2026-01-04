import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { prisma } from '../../src/lib/db/prisma';
import { signToken, signRefreshToken } from '../../src/features/auth/jwt';
import { UserRole } from '@prisma/client';

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    agencyName: z.string().min(2),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, agencyName } = RegisterSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction: Create User + Agency + Refresh Token
        const { user, refreshTokenRecord } = await prisma.$transaction(async (tx) => {
            // 1. Create Agency
            const agency = await tx.agency.create({
                data: {
                    name: agencyName,
                    email: email, // Use user email as agency email for now
                    verification_status: 'UNVERIFIED',
                },
            });

            // 2. Create User linked to Agency
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
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                },
            });

            return { user, refreshTokenRecord };
        });

        // Access Token
        const accessToken = signToken({ userId: user.id, role: user.role });

        // Set Cookies
        const accessTokenCookie = serialize('auth_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 mins
            path: '/',
        });

        const refreshTokenCookie = serialize('refresh_token', refreshTokenRecord.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
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
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
