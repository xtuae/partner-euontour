import { z } from "zod";

export const verificationSubmissionSchema = z.object({
    businessName: z.string(),
    address: z.string(),
    documents: z.array(
        z.object({
            type: z.string(),
            fileUrl: z.string().url(),
        })
    ),
});
