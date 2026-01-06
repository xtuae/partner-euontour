import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../src/lib/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';
import { z } from 'zod';

const SettingsSchema = z.object({
    settings: z.array(z.object({
        key: z.string(),
        value: z.string() // Boolean flags as string "true"/"false"
    }))
});

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (!['SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
        const settings = await prisma.systemSettings.findMany();
        return res.status(200).json({ settings });
    }

    if (req.method === 'PUT') {
        try {
            const { settings } = SettingsSchema.parse(req.body);

            await prisma.$transaction(async (tx: any) => {
                for (const setting of settings) {
                    await tx.systemSettings.upsert({
                        where: { key: setting.key },
                        update: {
                            value: setting.value,
                            updated_by: userToken.userId
                        },
                        create: {
                            key: setting.key,
                            value: setting.value,
                            updated_by: userToken.userId,
                        }
                    });
                }

                await tx.auditLog.create({
                    data: {
                        actor_id: userToken.userId,
                        action: 'SYSTEM_SETTINGS_UPDATED',
                        entity: 'SYSTEM',
                        entity_id: 'GLOBAL'
                    }
                });
            });

            return res.status(200).json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
