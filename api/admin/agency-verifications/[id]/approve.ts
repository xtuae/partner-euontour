import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_middleware/auth.js';
import { prisma } from '../../../../src/lib/db/prisma.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../../../src/lib/email.js'; // Ensure this handles HTML

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    // Check Role
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.query; // This is the AgencyOwnerKyc ID or Agency ID? 
    // Prompt says: "Business + Owner KYC approved/rejected together"
    // I made the endpoint structure .../:id
    // If id is AgencyOwnerKyc id, I can find the agency.

    if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid ID' });

    try {
        // Find the KYC record
        const kyc = await prisma.agencyOwnerKyc.findUnique({
            where: { id },
            include: { agency: true }
        });

        if (!kyc) return res.status(404).json({ error: 'Verification record not found' });

        // Update Transaction
        await prisma.$transaction([
            prisma.agencyOwnerKyc.update({
                where: { id },
                data: { status: 'VERIFIED' }
            }),
            prisma.agency.update({
                where: { id: kyc.agencyId },
                data: { verification_status: 'VERIFIED' }
            }),
            prisma.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: 'APPROVE_KYC',
                    entity: 'AGENCY_KYC',
                    entity_id: id,
                }
            })
        ]);

        // Send Email
        const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
        await sendEmail({
            to: kyc.agency.email,
            ...EMAIL_TEMPLATES.KYC_APPROVED_AGENCY(kyc.agency.name, `${process.env.NEXT_PUBLIC_APP_URL}/login`)
        });

        return res.status(200).json({ success: true, message: 'Agency verified' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
