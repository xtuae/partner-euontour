import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const registerSchema = z.object({
    agencyName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
});

export const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(8),
});
