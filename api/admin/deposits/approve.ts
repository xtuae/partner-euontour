import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db } from '../../../src/lib/db';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole, DepositStatus, LedgerType } from '../../../src/lib/types';
import { parse } from 'cookie';
import { sendEmail, EMAIL_TEMPLATES } from '../../../src/lib/email';

const ApproveSchema = z.object({
    depositId: z.string().uuid(),
    action: z.enum(['APPROVE', 'REJECT']),
    note: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = verifyToken(token) as { userId: string, role: string } | null;
        if (!payload || (payload.role !== UserRole.ADMIN && payload.role !== UserRole.SUPER_ADMIN)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { depositId, action } = ApproveSchema.parse(req.body);

        const deposit = await db.deposit.updateStatus(depositId, action === 'APPROVE' ? DepositStatus.APPROVED : DepositStatus.REJECTED);

        if (action === 'APPROVE') {
            await db.wallet.addEntry({
                agency_id: deposit.agency_id,
                amount: deposit.amount,
                type: LedgerType.CREDIT,
                description: 'Deposit Approved',
                reference_type: 'DEPOSIT',
                reference_id: deposit.id,
            });
        }

        // Mock Finding agency
        const agencyUser = { email: 'agency@example.com' };

        // Async: Audit & Email
        const emailTemplate = action === 'APPROVE'
            ? EMAIL_TEMPLATES.DEPOSIT_APPROVED(Number(deposit.amount).toFixed(2))
            : EMAIL_TEMPLATES.DEPOSIT_REJECTED(Number(deposit.amount).toFixed(2));

        if (agencyUser) {
            Promise.all([
                // Mock Audit
                sendEmail({
                    to: agencyUser.email,
                    subject: emailTemplate.subject,
                    body: emailTemplate.body
                })
            ]);
        }

        return res.status(200).json({ success: true, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
