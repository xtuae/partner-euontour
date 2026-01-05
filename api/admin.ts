import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from './_middleware/auth.js';
import { logAudit } from '../frontend/src/lib/audit.js';

export const config = {
    runtime: 'nodejs',
    maxDuration: 10
};

async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
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

    return res.status(404).json({ error: 'Endpoint not found' });
}

const VerifyAgencySchema = z.object({
    agencyId: z.string().uuid(),
    action: z.enum(['APPROVE', 'REJECT']),
});

async function verifyAgency(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { agencyId, action } = VerifyAgencySchema.parse(req.body);

        // Mock DB Update
        // await db.agency.updateStatus(agencyId, action === 'APPROVE' ? 'VERIFIED' : 'REJECTED');

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
    // Mock List
    return res.status(200).json({ deposits: [] });
}

const ApproveDepositSchema = z.object({
    depositId: z.string().uuid(),
    action: z.enum(['APPROVE', 'REJECT']),
});

async function approveDeposit(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { depositId, action } = ApproveDepositSchema.parse(req.body);
        // Mock Update
        // await db.deposit.updateStatus(depositId, action);

        logAudit({
            actorId: user.userId,
            action: `DEPOSIT_${action}`,
            entity: 'DEPOSIT',
            entityId: depositId,
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
    // Mock List
    return res.status(200).json({ logs: [] });
}

async function listAgencies(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    // Mock List
    return res.status(200).json({ agencies: [] });
}

export default requireAuth(handler);
