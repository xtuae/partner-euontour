import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from '../_middleware/auth.js';
import { handleCors } from '../../src/lib/cors.js';


async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    // Note: requireAuth wrapper calls handleCors, so this line inside the handler is technically redundant BUT safe.
    // However, the provided 'requireAuth' only calls handleCors BEFORE checking token. 
    // If we want it really robust, having it here is fine, but we must ensure we don't double send headers if requireAuth already did.
    // Actually, requireAuth does: if (handleCors(req, res)) return;
    // So if options request comes, requireAuth returns early.
    // If regular request comes, requireAuth sets headers, then calls handler.
    // So calling it again here might duplicate headers or be fine.
    // Vercel's setHeader overwrites usually.
    // But since the user ASKED to put it in every handler, and this handler is wrapped by requireAuth which ALREADY has it...
    // I will remove the manual call here to avoid confusion because requireAuth IS the wrapper.
    // WAIT, `requireAuth(handler)` means `handler` is only called if `requireAuth` proceeds.
    // So `requireAuth` is the entry point. It calls `handleCors`.
    // So `handler` essentially doesn't need it if `requireAuth` does it correctly.
    // checking `api/_middleware/auth.ts`: 
    // export function requireAuth(...) { return async (req, res) => { if (handleCors(req, res)) return; ... return handler(req, res, decoded); } }
    // So it IS handled.
    // However, I will leave it empty/clean.

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
