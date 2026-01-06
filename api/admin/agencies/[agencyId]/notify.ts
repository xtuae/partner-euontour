import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';
import { sendEmail } from '../../../src/lib/email.js';
import { z } from 'zod';

const NotifySchema = z.object({
    subject: z.string().min(1),
    message: z.string().min(1) // HTML allowed
});

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { agencyId } = req.query;
    if (!agencyId || Array.isArray(agencyId)) return res.status(400).json({ error: 'Invalid Agency ID' });

    try {
        const { subject, message } = NotifySchema.parse(req.body);

        const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
        if (!agency) return res.status(404).json({ error: 'Agency not found' });

        await sendEmail({
            to: agency.email,
            subject,
            body: message // Trusted Admin Input
        });

        await prisma.auditLog.create({
            data: {
                actor_id: userToken.userId,
                action: 'AGENCY_MANUAL_NOTIFY',
                entity: 'AGENCY',
                entity_id: agencyId,
                // "Reasons" or content not stored in AuditLog schema but Action covers it.
            }
        });

        return res.status(200).json({ success: true, message: 'Notification sent' });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
