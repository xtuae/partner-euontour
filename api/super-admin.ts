import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAuth } from './_middleware/auth';
import { db } from '@/lib/db';
import { prisma } from '@/lib/db/prisma';
import { LedgerType } from '@/lib/types'; // Or prisma client
import { logAudit } from '@/lib/audit';

export const config = {
    runtime: 'nodejs',
    maxDuration: 10
};

async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    const url = req.url || '';

    // Super Admin Check
    if (user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden. Super Admin only.' });
    }

    if (url.includes('/api/super-admin/admins/manage')) return createAdmin(req, res, user);
    if (url.includes('/api/super-admin/wallet/adjust')) return adjustWallet(req, res, user);
    if (url.includes('/api/super-admin/finance/overview')) return getOverview(req, res, user);

    return res.status(404).json({ error: 'Endpoint not found' });
}

const CreateAdminSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

async function createAdmin(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, password, role } = CreateAdminSchema.parse(req.body);

        const existingUser = await db.user.findByEmail(email);
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Using prisma directly for create as repo might be limited
        const newUser = await prisma.user.create({
            data: {
                email,
                password_hash: hashedPassword,
                role: role as any, // Role enum casting
            }
        });

        logAudit({
            actorId: user.userId,
            action: 'ADMIN_CREATE',
            entity: 'USER',
            entityId: newUser.id,
            ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
        });

        return res.status(201).json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } });

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
    reason: z.string().min(5),
});

async function adjustWallet(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { agencyId, amount, type, reason } = AdjustWalletSchema.parse(req.body);

        const agency = await db.agency.findById(agencyId);
        if (!agency) return res.status(404).json({ error: 'Agency not found' });

        await db.wallet.addEntry({
            agency_id: agencyId,
            amount: amount,
            type: type === 'CREDIT' ? LedgerType.CREDIT : LedgerType.DEBIT,
            description: `Manual Adjustment: ${reason}`,
            reference_type: 'MANUAL_ADJUSTMENT',
            reference_id: user.userId,
        });

        logAudit({
            actorId: user.userId,
            action: `WALLET_ADJUST_${type}: ${reason}`,
            entity: 'WALLET',
            entityId: agencyId,
        });

        return res.status(200).json({ success: true, message: 'Wallet adjusted successfully' });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getOverview(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Simplified overview
        // In real app, run aggregate queries here
        return res.status(200).json({
            liabilities: 0,
            revenue: 0,
            pendingDeposits: 0,
            totalAgencies: 0,
            totalUsers: 0
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
