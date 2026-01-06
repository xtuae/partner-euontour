import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../src/lib/auth.js';
import { prisma } from '../../../../src/lib/db/prisma.js';
import { z } from 'zod';

const CancelSchema = z.object({
    refund: z.boolean(),
    reason: z.string().optional()
});

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userToken.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { bookingId } = req.query;
    if (!bookingId || Array.isArray(bookingId)) return res.status(400).json({ error: 'Invalid Booking ID' });

    try {
        const { refund, reason } = CancelSchema.parse(req.body);

        await prisma.$transaction(async (tx: any) => {
            const booking = await tx.booking.findUnique({ where: { id: bookingId } });
            if (!booking) throw new Error('Booking not found');

            if (booking.status === 'CANCELLED' || booking.status === 'CANCELLED_BY_ADMIN') {
                throw new Error('Booking already cancelled');
            }

            // 1. Update Booking Status
            await tx.booking.update({
                where: { id: bookingId },
                data: { status: 'CANCELLED_BY_ADMIN' }
            });

            // 2. Optional Refund
            if (refund) {
                // Credit Agency Wallet
                const amount = Number(booking.amount); // Ensure number

                await tx.walletLedger.create({
                    data: {
                        agency_id: booking.agency_id,
                        type: 'CREDIT',
                        amount: amount,
                        reference_type: 'REFUND_ADMIN_CANCEL',
                        reference_id: booking.id
                    }
                });

                await tx.agency.update({
                    where: { id: booking.agency_id },
                    data: { wallet_balance: { increment: amount } }
                });
            }

            // 3. Audit Log
            await tx.auditLog.create({
                data: {
                    actor_id: userToken.userId,
                    action: 'BOOKING_CANCELLED_ADMIN',
                    entity: 'BOOKING',
                    entity_id: bookingId,
                    // "Reason": reason
                }
            });
        });

        return res.status(200).json({ success: true, message: `Booking cancelled ${refund ? 'with refund' : 'without refund'}` });

    } catch (error: any) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

export default requireAuth(handler);
