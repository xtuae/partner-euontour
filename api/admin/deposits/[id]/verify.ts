import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../src/lib/auth.js';
import { prisma } from '../../../../src/lib/db/prisma.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../../../src/lib/email.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'ADMIN' && userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.query;
    if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid ID' });

    try {
        const deposit = await prisma.deposit.findUnique({
            where: { id },
            include: { agency: true }
        });

        if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
        if (deposit.status !== 'PENDING_ADMIN') return res.status(400).json({ error: 'Deposit not in pending admin state' });

        // Update to PENDING_SUPER_ADMIN
        await prisma.deposit.update({
            where: { id },
            data: {
                status: 'PENDING_SUPER_ADMIN',
                reviewed_by: userToken.userId,
                reviewed_at: new Date()
            }
        });

        await prisma.auditLog.create({
            data: {
                actor_id: userToken.userId,
                action: 'ADMIN_DEPOSIT_VERIFIED',
                entity: 'DEPOSIT',
                entity_id: id,
            }
        });

        // Notify Super Admins
        const superAdmins = await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN' },
            select: { email: true }
        });

        const superLink = `${process.env.NEXT_PUBLIC_APP_URL}/super-admin/deposits`;
        await Promise.all(superAdmins.map((admin: any) =>
            sendEmail({
                to: admin.email,
                ...EMAIL_TEMPLATES.DEPOSIT_VERIFIED_SUPER_ADMIN(
                    deposit.agency.name,
                    `€${deposit.amount}`,
                    new Date().toLocaleString(),
                    superLink
                )
            })
        ));

        return res.status(200).json({ success: true, message: 'Deposit verified' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
