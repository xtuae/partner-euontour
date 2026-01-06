import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_middleware/auth.js';
import { prisma } from '../../../../src/lib/db/prisma.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../../../src/lib/email.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden. Only Super Admin can approve credits.' });
    }

    const { id } = req.query;
    if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid ID' });

    try {
        const deposit = await prisma.deposit.findUnique({
            where: { id },
            include: { agency: true }
        });

        if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
        if (deposit.status !== 'PENDING_SUPER_ADMIN') return res.status(400).json({ error: 'Deposit not ready for final approval' });

        // Update Wallet & Deposit TRANSACTION (Ledger First)
        await prisma.$transaction([
            // 1. Create Ledger Entry
            prisma.walletLedger.create({
                data: {
                    agency_id: deposit.agency_id,
                    type: 'CREDIT',
                    amount: deposit.amount,
                    reference_type: 'DEPOSIT',
                    reference_id: deposit.id
                }
            }),
            // 2. Update Agency Balance
            prisma.agency.update({
                where: { id: deposit.agency_id },
                data: {
                    wallet_balance: { increment: deposit.amount }
                }
            }),
            // 3. Update Deposit Status
            prisma.deposit.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    reviewed_by: userToken.userId,
                    reviewed_at: new Date()
                }
            }),
            // 4. Audit Log
            prisma.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: 'SUPER_ADMIN_DEPOSIT_APPROVED',
                    entity: 'DEPOSIT',
                    entity_id: id
                }
            })
        ]);

        const updatedAgency = await prisma.agency.findUnique({ where: { id: deposit.agency_id } });

        await sendEmail({
            to: deposit.agency.email,
            ...EMAIL_TEMPLATES.DEPOSIT_APPROVED(
                deposit.agency.name,
                `€${deposit.amount}`,
                `€${updatedAgency?.wallet_balance || '0.00'}`,
                new Date().toLocaleString()
            )
        });

        return res.status(200).json({ success: true, message: 'Deposit approved and credited' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
