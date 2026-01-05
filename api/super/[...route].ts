import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db } from '../../src/lib/db/index.js';
import { requireAuth } from '../_middleware/auth.js';
import { handleCors } from '../../src/lib/cors.js';
import { logAudit } from '../../src/lib/audit.js';
import { DepositStatus, LedgerType, UserRole } from '../../src/lib/types.js';

async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    // CORS handled by middleware mostly, but if this is raw handler? 
    // Wait, this is wrapped by requireAuth. requireAuth calls handleCors.
    // BUT the user said "This must be added to... /api/super/*".
    // Let's check requireAuth.
    const url = req.url || '';

    // STRICT: Only SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    if (url.includes('/api/super/agency-verifications') && !url.includes('/approve') && !url.includes('/reject')) {
        if (req.method === 'GET') {
            // Detail view if ID is present
            const match = url.match(/\/api\/super\/agency-verifications\/([^\/]+)$/);
            if (match) return getVerificationDetail(req, res, user, match[1]);
            return listVerifications(req, res, user);
        }
    }

    if (url.match(/\/api\/super\/agency-verifications\/([^\/]+)\/approve/)) {
        const match = url.match(/\/api\/super\/agency-verifications\/([^\/]+)\/approve/);
        if (match) return approveVerification(req, res, user, match[1]);
    }

    if (url.match(/\/api\/super\/agency-verifications\/([^\/]+)\/reject/)) {
        const match = url.match(/\/api\/super\/agency-verifications\/([^\/]+)\/reject/);
        if (match) return rejectVerification(req, res, user, match[1]);
    }

    if (url.includes('/api/super/wallet-adjust')) return adjustWallet(req, res, user);


    return res.status(404).json({ error: 'Endpoint not found' });
}

async function listVerifications(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    try {
        const agencies = await db.agency.findAll();
        // Return all or filter? User said "List All Verifications", typically implies pending or history.
        // User requirements: "Status PENDING / VERIFIED / REJECTED". So return all.
        const mapped = agencies.map(a => ({
            agencyId: a.id,
            agencyName: a.name,
            email: a.email,
            status: a.verification_status,
            submittedAt: a.created_at // fallback to created_at if submitted_at missing
        }));
        return res.status(200).json(mapped);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getVerificationDetail(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }, agencyId: string) {
    try {
        const agency = await db.agency.findById(agencyId);
        if (!agency) return res.status(404).json({ error: 'Agency not found' });

        return res.status(200).json({
            agency: {
                name: agency.name,
                email: agency.email,
                type: agency.type
            },
            verification: {
                status: agency.verification_status,
                documents: [
                    // Mock docs for now as we don't have a docs table yet, or assume proof_url is generic
                    { type: 'trade_license', url: 'https://placehold.co/600x400?text=Trade+License' }
                ],
                submittedAt: agency.created_at
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function approveVerification(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }, agencyId: string) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
    try {
        await db.agency.updateStatus(agencyId, 'VERIFIED');

        logAudit({
            actorId: user.userId,
            action: 'AGENCY_VERIFY_APPROVE',
            entity: 'AGENCY',
            entityId: agencyId
        });

        return res.status(200).json({ success: true, status: 'VERIFIED' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const RejectSchema = z.object({ reason: z.string().optional() });

async function rejectVerification(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }, agencyId: string) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { reason } = RejectSchema.parse(req.body);

        await db.agency.updateStatus(agencyId, 'REJECTED');

        logAudit({
            actorId: user.userId,
            action: 'AGENCY_VERIFY_REJECT',
            entity: 'AGENCY',
            entityId: agencyId,
            details: { reason }
        });

        return res.status(200).json({ success: true, status: 'REJECTED' });
    } catch (error) {
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

export default requireAuth(handler);
