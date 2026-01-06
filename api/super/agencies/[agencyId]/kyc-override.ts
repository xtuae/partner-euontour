import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_middleware/auth.js';
import { prisma } from '../../../../src/lib/db/prisma.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../../../src/lib/email.js';
import { z } from 'zod';

const OverrideSchema = z.object({
    status: z.enum(['VERIFIED', 'REJECTED']),
    note: z.string().optional()
});

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden. Super Admin only.' });
    }

    const { agencyId } = req.query;
    if (!agencyId || Array.isArray(agencyId)) return res.status(400).json({ error: 'Invalid ID' });

    try {
        const { status, note } = OverrideSchema.parse(req.body);

        const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
        if (!agency) return res.status(404).json({ error: 'Agency not found' });

        await prisma.$transaction(async (tx: any) => {
            // 1. Update Agency
            await tx.agency.update({
                where: { id: agencyId },
                data: {
                    verification_status: status
                }
            });

            // 2. Update AgencyOwnerKyc (if exists)
            // We find the latest one or update all?
            // Usually there is one active. I'll update the most recent one to keep sync.
            // Or simple approach: Update all PENDING ones to match new status.
            await tx.agencyOwnerKyc.updateMany({
                where: { agencyId: agencyId },
                data: {
                    status: status,
                    rejectionReason: status === 'REJECTED' ? note : null
                }
            });

            // 3. Audit Log
            await tx.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: 'AGENCY_KYC_OVERRIDE',
                    entity: 'AGENCY',
                    entity_id: agencyId,
                }
            });
        });

        // 4. Email Notification
        await sendEmail({
            to: agency.email,
            ...EMAIL_TEMPLATES.KYC_STATUS_UPDATE_MANUAL(
                agency.name,
                status,
                note || 'No additional notes provided.'
            )
        });

        return res.status(200).json({ success: true, message: `KYC overridden to ${status}` });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
