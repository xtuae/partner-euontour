import { prisma } from './db/prisma.js';

const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

export async function logAudit({
    actorId,
    action,
    entity,
    entityId,
    details,
    ipAddress
}: {
    actorId: string | undefined;
    action: string;
    entity: string;
    entityId: string | undefined;
    details?: any;
    ipAddress?: string;
}) {
    if (USE_MOCK_DB) {
        console.log(`[MOCK AUDIT] Action: ${action}, Actor: ${actorId}, Entity: ${entity}/${entityId}`, details);
        return;
    }

    try {
        await prisma.auditLog.create({
            data: {
                actor_id: actorId,
                action,
                entity,
                entity_id: entityId,
                ip_address: ipAddress
                // details: details ? JSON.stringify(details) : undefined // schema doesn't have details?
                // Checking schema... AuditLog has: actor_id, action, entity, entity_id, ip_address, created_at
                // No details column!
                // We'll ignore details for now to match schema.
            }
        });
    } catch (error) {
        console.error('Failed to log audit:', error);
    }
}
