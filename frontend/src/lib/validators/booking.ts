import { z } from "zod";

export const bookingSchema = z.object({
    tourId: z.string().uuid(),
    travelDate: z.string(), // ISO date
});
