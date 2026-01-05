import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/lib/db/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const isMockName = process.env.USE_MOCK_DB === 'true';

        // Attempt a real query
        const agencies = await db.agency.findAll();

        return res.status(200).json({
            status: 'ok',
            config: {
                use_mock_db_env: process.env.USE_MOCK_DB,
                is_mock_active: isMockName
            },
            connection: {
                success: true,
                agency_count: agencies.length,
                backend: isMockName ? 'InMemory' : 'Neon/Prisma'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('DB Connection Error:', error);
        return res.status(500).json({
            status: 'error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
