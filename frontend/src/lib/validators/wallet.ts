import { z } from "zod";

export const depositSchema = z.object({
    amount: z.number().positive(),
    bankReference: z.string().min(3),
    proofUrl: z.string().url().optional(),
});

export const walletAdjustmentSchema = z.object({
    agencyId: z.string().uuid(),
    type: z.enum(["CREDIT", "DEBIT"]),
    amount: z.number().positive(),
    reason: z.string().min(5),
});
