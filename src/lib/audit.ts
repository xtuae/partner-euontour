import { prisma } from './db/prisma.js';

const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

export async function logAudit({
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    details,
    ipAddress
}: {
    actorId: string;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
    ipAddress?: string;
}) {
    if (USE_MOCK_DB) {
        console.log(`[MOCK AUDIT] Action: ${action}, actorRole: ${actorRole || 'UNKNOWN'}, Actor: ${actorId}, Entity: ${entityType}/${entityId}`, details);
        return;
    }

    try {
        await prisma.auditLog.create({
            data: {
                actorId,
                actorRole: actorRole || 'UNKNOWN',
                action,
                entityType,
                entityId,
                details: details ? details : undefined,
                ipAddress
            }
        });
    } catch (error) {
        console.error('Failed to log audit:', error);
    }
}
