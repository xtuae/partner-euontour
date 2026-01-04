import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from './_middleware/auth';

export const config = {
    runtime: 'nodejs18.x',
    maxDuration: 10
};

async function handler(req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) {
    if (req.method === 'GET') return listBookings(req, res, user);
    if (req.method === 'POST') return createBooking(req, res, user);
    return res.status(405).json({ error: 'Method not allowed' });
}

async function listBookings(_req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    return res.status(200).json({ bookings: [] });
}

const CreateBookingSchema = z.object({
    tourId: z.string(),
    pax: z.number().int().positive(),
    date: z.string(),
});

async function createBooking(req: VercelRequest, res: VercelResponse, _user: { userId: string, role: string }) {
    try {
        const { tourId, pax, date } = CreateBookingSchema.parse(req.body);
        console.log('Booking request', tourId, pax, date);
        // Create Logic
        return res.status(201).json({ success: true, bookingId: 'mock-id' });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
