import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { prisma } from '../../src/lib/db/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../../src/features/notifications/email';

const ForgotPasswordSchema = z.object({
    email: z.string().email(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = ForgotPasswordSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal user existence
            return res.status(200).json({ success: true, message: 'If user exists, email sent.' });
        }

        // Generate Reset Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // Send Email
        await sendPasswordResetEmail(email, resetToken);

        return res.status(200).json({ success: true, message: 'If user exists, email sent.' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
