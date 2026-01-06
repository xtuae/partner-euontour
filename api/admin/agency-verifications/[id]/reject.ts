import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../_middleware/auth.js';
import { prisma } from '../../../../src/lib/db/prisma.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../../../src/lib/email.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    // Check Role
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.query;

    if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid ID' });
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

    try {
        const kyc = await prisma.agencyOwnerKyc.findUnique({
            where: { id },
            include: { agency: true }
        });

        if (!kyc) return res.status(404).json({ error: 'Verification record not found' });

        // Transaction
        await prisma.$transaction([
            prisma.agencyOwnerKyc.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason: reason
                }
            }),
            prisma.agency.update({
                where: { id: kyc.agencyId },
                data: { verification_status: 'REJECTED' }
            }),
            prisma.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: 'REJECT_KYC',
                    entity: 'AGENCY_KYC',
                    entity_id: id,
                }
            })
        ]);

        const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

        await sendEmail({
            to: kyc.agency.email,
            ...EMAIL_TEMPLATES.KYC_REJECTED_AGENCY(kyc.agency.name, reason, `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/verification`)
        });

        return res.status(200).json({ success: true, message: 'Verification rejected' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
