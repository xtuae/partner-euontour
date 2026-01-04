import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db } from '../../../src/lib/db';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole, LedgerType } from '../../../src/lib/types';
import { parse } from 'cookie';
import { logAudit } from '../../../src/lib/audit';

const AdjustWalletSchema = z.object({
    agencyId: z.string().uuid(),
    amount: z.number().positive(),
    type: z.enum(['CREDIT', 'DEBIT']),
    reason: z.string().min(5),
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
        if (!payload || payload.role !== UserRole.SUPER_ADMIN) {
            return res.status(403).json({ error: 'Forbidden. Super Admin only.' });
        }

        const { agencyId, amount, type, reason } = AdjustWalletSchema.parse(req.body);

        const agency = await db.agency.findById(agencyId);
        if (!agency) return res.status(404).json({ error: 'Agency not found' });

        // Transaction: Create Ledger + Log
        await db.wallet.addEntry({
            agency_id: agencyId,
            amount: amount,
            type: type === 'CREDIT' ? LedgerType.CREDIT : LedgerType.DEBIT,
            description: `Manual Adjustment: ${reason}`, // Using description field instead of ref type if easier, or map it.
            reference_type: 'MANUAL_ADJUSTMENT',
            reference_id: payload.userId, // Referencing Admin who did it
        });

        // Audit Log
        logAudit({
            actorId: payload.userId,
            action: `WALLET_ADJUST_${type}: ${reason}`,
            entity: 'WALLET',
            entityId: agencyId,
        });
        // Note: Reason is currently not stored in specific field, but could be appended to action if needed. 
        // For now we accept it as part of schema validation but don't persist it in a specific column as AuditLog is generic.

        return res.status(200).json({ success: true, message: 'Wallet adjusted successfully' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
