import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';

export async function reportsRoutes(req: Request, path: string, user: AuthUser) {
    // /api/reports/export
    requireRole(user, ['ADMIN', 'SUPER_ADMIN']);
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!type || !startDate || !endDate) {
        return Response.json({ error: 'Missing required query parameters: type, startDate, endDate' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set end date to end of day to include all records on that date
    end.setHours(23, 59, 59, 999);

    try {
        let result: any[] = [];

        if (type === 'agencies') {
            result = await prisma.agency.findMany({
                where: {
                    created_at: { gte: start, lte: end }
                },
                include: {
                    owner_kyc: { select: { fullName: true } },
                    _count: {
                        select: {
                            bookings: { where: { status: 'CONFIRMED' } }
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            });
            
            result = result.map(a => ({
                'Join Date': a.created_at.toLocaleDateString('en-GB'),
                'Agency Name': a.name,
                'Contact Person': a.owner_kyc?.[0]?.fullName || 'N/A',
                'Email': a.email,
                'Verification Status': a.verification_status,
                'Current Balance (€)': `€${Number(a.wallet_balance).toFixed(2)}`,
                'Total Bookings': a._count?.bookings || 0
            }));

        } else if (type === 'bookings') {
            result = await prisma.booking.findMany({
                where: {
                    created_at: { gte: start, lte: end }
                },
                include: {
                    agency: { select: { name: true } },
                    tour: { select: { name: true } }
                },
                orderBy: { created_at: 'desc' }
            });
            
            result = result.map(b => ({
                'Booking Date': b.created_at.toLocaleDateString('en-GB'),
                'Travel Date': new Date(b.travel_date).toLocaleDateString('en-GB'),
                'Booking ID': b.id,
                'Client/Agency': b.isRetail ? 'Retail Direct' : (b.agency?.name || 'Unknown'),
                'Tour Name': b.tour?.name || 'Unknown',
                'Guests': b.guests,
                'Total Revenue (€)': `€${Number(b.amount).toFixed(2)}`,
                'Status': b.status
            }));

        } else if (type === 'deposits') {
            result = await prisma.deposit.findMany({
                where: {
                    created_at: { gte: start, lte: end }
                },
                include: {
                    agency: { select: { name: true } }
                },
                orderBy: { created_at: 'desc' }
            });

            result = result.map(d => ({
                'Date': d.created_at.toLocaleDateString('en-GB'),
                'Agency Name': d.agency?.name || 'Unknown',
                'Payment Method': d.paymentMethod === 'STRIPE' ? 'Stripe' : 'Bank Transfer',
                'Amount (€)': `€${Number(d.amount).toFixed(2)}`,
                'Status': d.status
            }));

        } else if (type === 'wallet') {
            result = await prisma.walletLedger.findMany({
                where: {
                    created_at: { gte: start, lte: end }
                },
                include: {
                    agency: { select: { name: true, wallet_balance: true } }
                },
                orderBy: { created_at: 'desc' }
            });

            result = result.map(w => {
                const dateStr = w.created_at.toLocaleDateString('en-GB');
                return {
                    'Date': dateStr,
                    'Transaction ID': w.id,
                    'Agency Name': w.agency?.name || 'Unknown',
                    'Type': w.type,
                    'Description': w.description || '',
                    'Amount': `€${Number(w.amount).toFixed(2)}`,
                    'Balance After': `€0.00` // Placeholder as historical balance isn't tracked in ledger table currently
                };
            });
        } else {
            return Response.json({ error: 'Invalid report type' }, { status: 400 });
        }

        return Response.json({ data: result });
    } catch (error) {
        console.error('Report Error:', error);
        return Response.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
