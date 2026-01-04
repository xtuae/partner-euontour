import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db } from '../../../src/lib/db';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole } from '../../../src/lib/types';
import { sendEmail, EMAIL_TEMPLATES } from '../../../src/lib/email';

const VerifyAgencySchema = z.object({
    agencyId: z.string().uuid(),
    action: z.enum(['VERIFY', 'REJECT']),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = verifyToken(token) as { userId: string, role: string } | null;
        if (!payload || (payload.role !== UserRole.ADMIN && payload.role !== UserRole.SUPER_ADMIN)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { agencyId, action } = VerifyAgencySchema.parse(req.body);

        const status = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';

        const agency = await db.agency.updateStatus(agencyId, status);
        const agencyEmail = 'agency@example.com'; // Mock or fetch user

        const emailTemplate = action === 'VERIFY'
            ? EMAIL_TEMPLATES.VERIFICATION_APPROVED
            : EMAIL_TEMPLATES.VERIFICATION_REJECTED;

        // Async: Audit & Email
        // Async: Audit & Email
        Promise.all([
            // Mock Audit
            sendEmail({
                to: agencyEmail,
                subject: emailTemplate.subject,
                body: emailTemplate.body
            })
        ]);

        return res.status(200).json({ success: true, agency });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        if ((error as any).code === 'P2025') {
            return res.status(404).json({ error: 'Agency not found' });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
