import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditLogParams {
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
    ipAddress?: string;
}

/**
 * Creates an immutable audit log entry in the database.
 * Does not throw errors to prevent interrupting critical business flows.
 */
export async function createAuditLog(params: AuditLogParams) {
    try {
        await prisma.auditLog.create({
            data: {
                actorId: params.actorId,
                actorRole: params.actorRole,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                details: params.details || null,
                ipAddress: params.ipAddress || null,
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error, params);
    }
}
