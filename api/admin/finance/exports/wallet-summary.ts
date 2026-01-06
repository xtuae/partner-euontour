import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../src/lib/auth.js';
import { prisma } from '../../../../src/lib/db/prisma.js';
import { Parser } from 'json2csv';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (userToken.role !== 'ADMIN' && userToken.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const agencies = await prisma.agency.findMany({
            include: {
                ledger: true
            }
        });

        const data = agencies.map(a => {
            // Recalculate totals from ledger to be safe? Or rely on Aggregations?
            // "Reflect exact DB state".
            // Let's iterate ledger entries in memory for this summary.
            const totalCredits = a.ledger.filter(l => l.type === 'CREDIT').reduce((sum, l) => sum + Number(l.amount), 0);
            const totalDebits = a.ledger.filter(l => l.type === 'DEBIT').reduce((sum, l) => sum + Number(l.amount), 0);

            // Last activity
            const lastActivity = a.ledger.length > 0 ? a.ledger[a.ledger.length - 1].created_at : a.updated_at;

            return {
                'Agency Name': a.name,
                'Current Wallet Balance': `€${a.wallet_balance}`,
                'Total Credits': `€${totalCredits.toFixed(2)}`,
                'Total Debits': `€${totalDebits.toFixed(2)}`,
                'Last Activity Date': lastActivity.toISOString()
            };
        });

        await prisma.auditLog.create({
            data: {
                actor_id: userToken.userId,
                action: 'FINANCE_CSV_EXPORTED',
                entity: 'WALLET_SUMMARY'
            }
        });

        const parser = new Parser();
        const csv = parser.parse(data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=wallet-summary-export.csv');
        return res.status(200).send(csv);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
