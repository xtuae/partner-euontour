import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../_middleware/auth.js';
import { prisma } from '../../../../src/lib/db/prisma.js';
import { Parser } from 'json2csv';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'ADMIN' && userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { status, from, to } = req.query;

    try {
        const where: any = {};
        if (status) where.status = String(status);
        if (from || to) {
            where.created_at = {};
            if (from) where.created_at.gte = new Date(String(from));
            if (to) where.created_at.lte = new Date(String(to));
        }

        const deposits = await prisma.deposit.findMany({
            where,
            include: { agency: { select: { name: true } } }, // Join Agency Name
            orderBy: { created_at: 'desc' }
        });

        const data = deposits.map(d => ({
            'Deposit ID': d.id,
            'Agency Name': d.agency.name,
            'Amount': `€${d.amount}`,
            'Status': d.status,
            'Bank Reference': d.bank_reference,
            'Submitted At': d.created_at.toISOString(),
            'Approved By': d.reviewed_by || '',
            'Approved At': d.reviewed_at ? d.reviewed_at.toISOString() : ''
        }));

        // Audit Log
        if (userToken.userId) { // Check purely for safety, though requireAuth guarantees it
            await prisma.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: 'FINANCE_CSV_EXPORTED',
                    entity: 'DEPOSIT',
                    metadata: { filter: { status, from, to } }
                }
            });
        }

        const parser = new Parser();
        const csv = parser.parse(data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=deposits-export.csv');
        return res.status(200).send(csv);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
