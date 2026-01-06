import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'ADMIN' && userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { q } = req.query;

    if (!q || String(q).trim().length < 3) {
        return res.status(400).json({ error: 'Search query must be at least 3 characters' });
    }

    const searchQuery = String(q).trim();

    try {
        // Full Text Search using Prisma Raw Query
        // Searching both businessOcrText and ownerIdOcrText
        // Also matching Agency Name for convenience

        const results = await prisma.$queryRaw`
            SELECT 
                k.*, 
                a.name as "agencyName"
            FROM "AgencyOwnerKyc" k
            JOIN "Agency" a ON k."agencyId" = a.id
            WHERE 
                to_tsvector('english', COALESCE(k."businessOcrText", '') || ' ' || COALESCE(k."ownerIdOcrText", '')) 
                @@ plainto_tsquery('english', ${searchQuery})
                OR
                a.name ILIKE ${'%' + searchQuery + '%'}
            LIMIT 50;
        `;

        // JSON BigInt handling if any (though here we select strings mostly)
        // If IDs are BigInt, we need serialize. But IDs are UUID strings here.

        return res.status(200).json({ results });

    } catch (error) {
        console.error('KYC Search Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
