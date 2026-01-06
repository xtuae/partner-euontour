import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/lib/db/prisma.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../src/lib/email.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Basic Cron Security (Optional but recommended)
    // if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) ...

    try {
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

        const pendingItems = await prisma.agencyOwnerKyc.findMany({
            where: {
                status: 'PENDING',
                createdAt: {
                    lte: fourHoursAgo
                }
            },
            include: {
                agency: {
                    select: { name: true }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        if (pendingItems.length === 0) {
            return res.status(200).json({ message: 'No stale pending verifications' });
        }

        const count = pendingItems.length;
        const oldest = pendingItems[0];
        const waitTimeHours = Math.floor((Date.now() - oldest.createdAt.getTime()) / (1000 * 60 * 60));

        // Find Admins
        const admins = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            select: { email: true }
        });

        // EMAILTEMPLATES handles subject and body construction now


        // Send aggregated email
        for (const admin of admins) {
            await sendEmail({
                to: admin.email,
                ...EMAIL_TEMPLATES.ADMIN_REMINDER_PENDING(count, waitTimeHours, `${process.env.NEXT_PUBLIC_APP_URL}/admin/agency-verifications`)
            });
        }

        return res.status(200).json({ success: true, processed: count });

    } catch (error) {
        console.error('Cron Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
