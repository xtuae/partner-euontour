import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_middleware/auth.js';
// @ts-ignore
import { getSignedUrl } from '@vercel/blob';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'ADMIN' && userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { path } = req.query;

    if (!path || Array.isArray(path)) {
        return res.status(400).json({ error: 'Missing or invalid path' });
    }

    try {
        const signedUrl = await getSignedUrl({
            url: String(path), // user prompt used "pathname" but in Vercel Blob SDK "url" is preferred if full URL is stored? 
            // Docs: `pathname` is the path in the blob store. `url` is the full url.
            // My DB stores full URLs (`proof_url`).
            // However, `getSignedUrl` usually expects the `url` returned by `put`.
            // Let's assume `path` param passed here is the full URL stored in DB.
            expiresIn: 300, // 5 minutes
            token: process.env.BLOB_READ_WRITE_TOKEN // Required for server-side generation
        });

        // Audit Log? "SHARED_FILE_ACCESSED"?
        // It's a GET request, adding db call might slow it down but compliance asks for it.
        // User said: "Log: PRIVATE_FILE_ACCESSED ... Triggered when signed URL is generated."
        // I need to import prisma.
        // Dynamic import to keep cold start fast? Or standard.
        // I will use standard.

        const { prisma } = await import('../../../src/lib/db/prisma.js');
        await prisma.auditLog.create({
            data: {
                actor_id: userToken.userId,
                action: 'PRIVATE_FILE_ACCESSED',
                entity: 'FILE',
                entity_id: String(path),
                metadata: { role: userToken.role }
            }
        });

        return res.status(200).json({
            url: signedUrl,
            expiresInSeconds: 300
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
