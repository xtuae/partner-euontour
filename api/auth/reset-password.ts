import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../src/lib/db/prisma';

const ResetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(8),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token, password } = ResetPasswordSchema.parse(req.body);

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Update Password and Clear Token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
                // Optional user revocation logic here (revoke all sessions)
            },
        });

        // Revoke all refresh tokens for security
        await prisma.refreshToken.updateMany({
            where: { user_id: user.id },
            data: { revoked: true },
        });

        return res.status(200).json({ success: true, message: 'Password reset successful' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
