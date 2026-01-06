import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'ADMIN' && userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { action, agencyId, entity, from, to } = req.query;

    try {
        const where: any = {};

        if (action) where.action = String(action);
        if (agencyId) {
            // Audit logs might store agencyId in generic "entity_id" or dedicated field? So far generic "entity_id" for some, but specific for others?
            // Schema has `agencyId`? No, schema has `actor_id` and generic `entity`.
            // Wait, user final requirements said "Audit Log (Mandatory) model AuditLog { ... agencyId String? ... }"
            // But my verification of schema used `actor` relation only and generic entity.
            // Oh, I updated schema via "Schema Synced to Requirements" but I did NOT add `agencyId` to AuditLog?
            // Let's re-verify schema in my thought.
            // I recall seeing "entity" and "entity_id".
            // User's Final Request: "model AuditLog { ... agencyId String? ... }"
            // My update: added `metadata Json?`. Did I add agencyId?
            // Checking "The following changes were made... to prisma/schema.prisma": I added `metadata`. I did NOT add `agencyId`.
            //
            // CRITICAL MISS: I might have missed `agencyId` in AuditLog if the user requested it explicitly in "Final Schema".
            // User request:
            // model AuditLog { ... agencyId String? ... }
            // My previous view of `prisma/schema.prisma` lines 210+ showed `actor_id`, `action`, `entity`, `entity_id`.
            // I updated `metadata`.
            //
            // If I missed `agencyId`, I should add it now OR map filters to `entity: AGENCY, entity_id: id`.
            // "agencyId" query param is requested.
            // If I filter by agencyId, I must know which field holds it.
            // If the schema lacks `agencyId`, I should add it for easier filtering, OR interpret `entity_id` as agencyId when entity is AGENCY.
            // But what about "Deposit Approved"? Entity=DEPOSIT. AgencyId would be separate.
            // So `agencyId` column is nice to have for "Audit logs related to Agency X".
            //
            // I will add `agency_id` to `AuditLog` model in this step if I can, or filter via metadata logic? 
            // Metadata is JSON, filtering is hard.
            // Best to Add `agency_id` to schema.
            //
            // Let's write the code assuming `agency_id` exists, then update schema immediately.
            where.agency_id = String(agencyId);
        }

        if (entity) where.entity = String(entity);

        if (from || to) {
            where.created_at = {};
            if (from) where.created_at.gte = new Date(String(from));
            if (to) where.created_at.lte = new Date(String(to));
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 100,
            include: {
                actor: { select: { email: true, role: true } }
            }
        });

        return res.status(200).json({ logs });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
