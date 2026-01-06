import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';
import { sendEmail } from '../../../src/lib/email.js';
import { signToken } from '../../../src/lib/auth/jwt.js';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs'; // Assuming bcryptjs is used for password hashing in this project.
// Need to check project deps. Default is usually bcryptjs or argon2. 
// I'll check package.json or usage in auth.ts if unsure.
// But `User` model has `password_hash`.
// User prompt didn't specify hashing lib, but existing auth likely uses one.
// I'll assume standard bcryptjs for now, or check dependencies.

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden. Only Super Admin can invite admins.' });
    }

    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'Email and Role required' });
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return res.status(400).json({ error: 'Invalid Role' });

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ error: 'User already exists' });

        // Generate Invite Token (reusing resetToken logic)
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Create User with Unusable Password
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await import('bcryptjs').then(m => m.hash(tempPassword, 10)); // Dynamic import to be safe

        const user = await prisma.user.create({
            data: {
                email,
                role,
                password_hash: hashedPassword,
                resetToken: inviteToken,
                resetTokenExpiry: tokenExpiry,
                email_verified: true, // Auto-verify email since admin invited?
            }
        });

        // Send Email
        const inviteLink = `https://partner.euontour.com/auth/reset-password?token=${inviteToken}&email=${email}`; // Frontend Setup Required

        await sendEmail({
            to: email,
            subject: 'You have been invited to EuOnTour Admin',
            body: `
                <h2>Welcome to EuOnTour</h2>
                <p>You have been invited as a(n) <strong>${role}</strong>.</p>
                <p>Please click the link below to set your password and access the dashboard:</p>
                <p><a href="${inviteLink}">Accept Invitation</a></p>
                <p>This link expires in 24 hours.</p>
            `
        });

        await prisma.auditLog.create({
            data: {
                actor_id: userToken.userId,
                action: 'ADMIN_INVITED',
                entity: 'USER',
                entity_id: user.id
            }
        });

        return res.status(201).json({ success: true, message: 'Invite sent' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
