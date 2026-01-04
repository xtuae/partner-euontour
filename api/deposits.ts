import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from './_middleware/auth';

export const config = {
    runtime: 'nodejs',
    maxDuration: 10
};

async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    // /api/deposits
    if (req.method === 'GET') return listDeposits(req, res, user);
    if (req.method === 'POST') return createDeposit(req, res, user);

    return res.status(405).json({ error: 'Method not allowed' });
}

async function listDeposits(_req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    // Return mock deposits for now or implement list in repo
    // db.deposit.findMany({ where: { agencyId: ... } })
    return res.status(200).json({ deposits: [] });
}

const CreateDepositSchema = z.object({
    amount: z.number().positive(),
    proofUrl: z.string().url(),
});

async function createDeposit(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    try {
        const { amount, proofUrl } = CreateDepositSchema.parse(req.body);
        console.log('Deposit created', amount, proofUrl);
        // Create Logic
        // await db.deposit.create(...)

        return res.status(201).json({ success: true, message: 'Deposit submitted' });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
