import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../src/lib/db';
import { verifyToken } from '../../../src/features/auth/jwt';
import { UserRole } from '../../../src/lib/types';
import { parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = verifyToken(token) as { userId: string, role: string } | null;
        if (!payload || (payload.role !== UserRole.ADMIN && payload.role !== UserRole.SUPER_ADMIN)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const agencyId = req.query.id as string;
        if (!agencyId) {
            return res.status(400).json({ error: 'Agency ID required' });
        }

        const agency = await db.agency.findById(agencyId);

        if (!agency) {
            return res.status(404).json({ error: 'Agency not found' });
        }

        // Fetch Relations Manually (Mock)
        const users = await db.user.findByAgency(agencyId);
        const allDeposits = await db.deposit.findByAgency(agencyId);
        const allBookings = await db.booking.findByAgency(agencyId);

        // Calculate Balance
        const balance = await db.wallet.getBalance(agencyId);

        // Construct Composite Object
        const agencyData = {
            ...agency,
            users: users.map(u => ({ id: u.id, email: u.email, role: u.role, last_login: null })), // simplified
            deposits: allDeposits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
            bookings: allBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
            documents: [] // Mock empty for now
        };

        return res.status(200).json({ agency: agencyData, balance });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
