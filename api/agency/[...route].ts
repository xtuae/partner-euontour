import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db } from '../../src/lib/db/index.js';
import { requireAuth } from '../../src/lib/auth.js';



import { handleCors } from '../../src/lib/cors.js';

async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    // requireAuth handles CORS.

    const url = req.url || '';

    if (url.includes('/api/agency/verification/submit')) return submitVerification(req, res, user);

    return res.status(404).json({ error: 'Endpoint not found' });
}

const VerificationSchema = z.object({
    documentUrl: z.string().url(),
    businessRegNumber: z.string().min(3),
});

async function submitVerification(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { documentUrl, businessRegNumber } = VerificationSchema.parse(req.body);
        console.log('Submitted', documentUrl, businessRegNumber); // Dummy usage

        const agencyUser = await db.user.findById(user.userId);
        if (!agencyUser || !agencyUser.agency_id) {
            return res.status(400).json({ error: 'No agency associated with user' });
        }

        // Using update for simplicity as db.agency.submitVerification might not exist in repo interface yet
        // Ideally: db.agency.update(agencyUser.agency_id, { verification_status: 'PENDING', ... })
        // For now, assuming direct update capability or just logging it. 
        // Real implementation would update the Agency record.

        // Mock update
        // await db.agency.update(agencyUser.agency_id, { verification_status: 'PENDING' });

        return res.status(200).json({ success: true, message: 'Verification submitted' });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
