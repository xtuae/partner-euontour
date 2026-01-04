import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { prisma } from '../../../src/lib/db/prisma';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole, VerificationStatus } from '@prisma/client';

const VerificationSubmitSchema = z.object({
    docType: z.string().min(1),
    fileUrl: z.string().url(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = verifyToken(token) as { userId: string, role: string } | null;
        if (!payload || payload.role !== UserRole.AGENCY) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { agency: true }
        });

        if (!user || !user.agency) {
            return res.status(400).json({ error: 'User not associated with an agency' });
        }

        const { docType, fileUrl } = VerificationSubmitSchema.parse(req.body);

        // Transaction: Create Document + Update Agency Status
        await prisma.$transaction(async (tx) => {
            await tx.verificationDocument.create({
                data: {
                    agency_id: user.agency!.id,
                    doc_type: docType,
                    file_url: fileUrl,
                }
            });

            await tx.agency.update({
                where: { id: user.agency!.id },
                data: {
                    verification_status: VerificationStatus.UNDER_REVIEW
                }
            });
        });

        return res.status(200).json({ success: true, status: 'UNDER_REVIEW' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
