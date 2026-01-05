import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db } from '../../src/lib/db/index.js';
import { requireAuth } from '../_middleware/auth.js';
import { handleCors } from '../../src/lib/cors.js';
import { logAudit } from '../../src/lib/audit.js';
import { LedgerType, DepositStatus } from '../../src/lib/types.js';


async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    // Middleware handles CORS if protecting the route, but double check isn't harmful if structured right.
    // However, requireAuth wraps this, so requireAuth handles it.
    // But we might have public admin routes? Unlikely.
    const url = req.url || '';

    // Admin Access Check
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    if (url.includes('/api/admin/agency/verify')) return verifyAgency(req, res, user);
    if (url.includes('/api/admin/deposits/list')) return listDeposits(req, res, user);
    if (url.includes('/api/admin/deposits/approve')) return approveDeposit(req, res, user);
    if (url.includes('/api/admin/audit/list')) return listAuditLogs(req, res, user);
    if (url.includes('/api/admin/agencies/get')) return listAgencies(req, res, user);
    if (url.includes('/api/admin/stats')) return listStats(req, res, user);
    if (url.includes('/api/super/wallet-adjust')) return adjustWallet(req, res, user);

    return res.status(404).json({ error: 'Endpoint not found' });
}

// ... existing verifyAgency ... (No changes needed, already verified)

async function listStats(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const agencies = await db.agency.findAll();
        const deposits = await db.deposit.findAll();
        const tours = await db.tour.findAllActive();

        const stats = {
            totalAgencies: agencies.length,
            pendingVerifications: agencies.filter((a: any) => a.verification_status !== 'VERIFIED' && a.verification_status !== 'REJECTED').length,
            pendingDeposits: deposits.filter((d: any) => d.status === 'PENDING').length,
            activeTours: tours.length
        };
        return res.status(200).json({ stats });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const VerifyAgencySchema = z.object({
    agencyId: z.string().uuid(),
    action: z.enum(['APPROVE', 'REJECT']),
});

async function verifyAgency(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { agencyId, action } = VerifyAgencySchema.parse(req.body);
        await db.agency.updateStatus(agencyId, action === 'APPROVE' ? 'VERIFIED' : 'REJECTED');
        logAudit({
            actorId: user.userId,
            action: `AGENCY_VERIFY_${action}`,
            entity: 'AGENCY',
            entityId: agencyId,
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function listDeposits(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const deposits = await db.deposit.findAll();
        const pending = deposits.filter(d => d.status === 'PENDING');
        return res.status(200).json({ deposits: pending });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const ApproveDepositSchema = z.object({
    depositId: z.string().uuid(),
    action: z.enum(['APPROVE', 'REJECT']),
});

async function approveDeposit(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { depositId, action } = ApproveDepositSchema.parse(req.body);

        // 1. Get deposit to find amount and agency
        // (Optimally this should be an atomic transaction in a robust system)
        const deposits = await db.deposit.findAll(); // Inefficient but sticking to repos
        const deposit = deposits.find(d => d.id === depositId);
        if (!deposit) return res.status(404).json({ error: 'Deposit not found' });

        if (deposit.status !== DepositStatus.PENDING) return res.status(400).json({ error: 'Deposit already processed' });

        // 2. Update Status
        await db.deposit.updateStatus(depositId, action === 'APPROVE' ? DepositStatus.APPROVED : DepositStatus.REJECTED);

        if (action === 'APPROVE') {
            await db.wallet.addEntry({
                agency_id: deposit.agency_id,
                amount: deposit.amount,
                type: LedgerType.CREDIT,
                reference_type: 'DEPOSIT',
                reference_id: depositId,
                description: `Deposit Approved: ${depositId}`
            });
        }

        logAudit({
            actorId: user.userId,
            action: `DEPOSIT_${action}`,
            entity: 'DEPOSIT',
            entityId: depositId,
            details: { amount: deposit.amount, agencyId: deposit.agency_id }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const AdjustWalletSchema = z.object({
    agencyId: z.string().uuid(),
    amount: z.number().positive(),
    type: z.enum(['CREDIT', 'DEBIT']),
    reason: z.string().min(1)
});

async function adjustWallet(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    // STRICT: Only SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });

    try {
        const { agencyId, amount, type, reason } = AdjustWalletSchema.parse(req.body);

        await db.wallet.addEntry({
            agency_id: agencyId,
            amount: amount,
            type: type === 'CREDIT' ? LedgerType.CREDIT : LedgerType.DEBIT,
            reference_type: 'MANUAL_ADJUSTMENT',
            reference_id: `ADMIN_${user.userId}`,
            description: reason
        });

        logAudit({
            actorId: user.userId,
            action: `WALLET_ADJUST_${type}`,
            entity: 'WALLET',
            entityId: agencyId,
            details: { amount, reason }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function listAuditLogs(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return res.status(200).json({ logs: [] });
}

async function listAgencies(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const agencies = await db.agency.findAll();
        return res.status(200).json({ agencies });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
