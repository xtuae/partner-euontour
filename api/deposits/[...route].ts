import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_middleware/auth.js';
import { prisma } from '../../src/lib/db/prisma.js';
import { uploadFile } from '../../src/lib/storage.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../src/lib/email.js';
import formidable from 'formidable';

export const config = {
    api: {
        bodyParser: false,
    },
};

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method === 'GET') return listDeposits(req, res, userToken);
    if (req.method === 'POST') return createDeposit(req, res, userToken);

    return res.status(405).json({ error: 'Method not allowed' });
}

async function listDeposits(_req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    try {
        let where: any = {};

        if (userToken.role === 'AGENCY') {
            const user = await prisma.user.findUnique({
                where: { id: userToken.userId },
                select: { agency_id: true }
            });
            if (!user || (!user.agency_id)) {
                // Should ideally not happen if role is AGENCY but safe check
                return res.status(200).json({ deposits: [] });
            }
            where.agency_id = user.agency_id;
        }

        const deposits = await prisma.deposit.findMany({
            where,
            orderBy: { created_at: 'desc' },
            include: { agency: { select: { name: true } } }
        });

        return res.status(200).json({ deposits });
    } catch (error) {
        console.error('List Deposits Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function createDeposit(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (userToken.role !== 'AGENCY') {
        return res.status(403).json({ error: 'Only agencies can create deposits' });
    }

    // 1. Get Agency ID
    const user = await prisma.user.findUnique({
        where: { id: userToken.userId },
        select: { agency_id: true }
    });

    if (!user || !user.agency_id) return res.status(400).json({ error: 'Agency not linked' });
    const agencyId = user.agency_id;

    // 2. Parse Form
    const form = formidable({ keepExtensions: true });

    const parseForm = () => new Promise<{ fields: formidable.Fields, files: formidable.Files }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });

    try {
        const { fields, files } = await parseForm();

        const amountStr = Array.isArray(fields.amount) ? fields.amount[0] : fields.amount;
        const proofFile = Array.isArray(files.proof_image) ? files.proof_image[0] : files.proof_image;

        if (!amountStr || !proofFile) {
            return res.status(400).json({ error: 'Amount and proof image required' });
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // 3. Upload File
        // Storage: /deposits/{agencyId}/{depositId}.jpg - Wait, we don't have depositId yet.
        // We will generate the Deposit UUID then use it? Or just use temp name.
        // Schema uses UUID. We can't predict it easily unless we use client-side ID or create first.
        // I'll create the Deposit in DB first? No, need URL.
        // I'll use a random UUID for the filename to match the prompt's STYLE, even if not the exact DB ID yet.
        // Or I can just use timestamp. Prompt: /deposits/{agencyId}/{depositId}.jpg
        // I'll assume they want the DB ID. I'll pre-generate UUID or update after upload?
        // Updating after upload involves 2 DB calls (Create, Update).
        // I'll just use a random ID for the file matching the "pattern" but not necessarily strict DB ID match if unnecessary.
        // PROMPT SAYS: /deposits/{agencyId}/{depositId}.jpg
        // I will adhere to it.
        // I'll use `crypto.randomUUID()` for the deposit ID, create logic, then upload.

        // Wait, prisma creates UUID default. I can pass it manually.
        const depositId = crypto.randomUUID();

        // Upload
        const proofUrl = await uploadFile(proofFile, `deposits/${agencyId}`, `${depositId}.jpg`);

        // 4. Create Deposit in DB
        // 4. Create Deposit in DB
        await prisma.deposit.create({
            data: {
                id: depositId,
                agency_id: agencyId,
                amount: amount,
                bank_reference: 'UPLOADED_PROOF',
                proof_url: proofUrl.url,
                thumbnail_url: proofUrl.thumbnailUrl || null,
                status: 'PENDING_ADMIN' // Updated status
            }
        });

        // 5. Audit Log
        await prisma.auditLog.create({
            data: {
                actor_id: userToken.userId,
                action: 'AGENCY_DEPOSIT_SUBMITTED',
                entity: 'DEPOSIT',
                entity_id: depositId,
            }
        });

        // 6. Notify Admins
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { email: true }
        });

        const agency = await prisma.agency.findUnique({
            where: { id: agencyId },
            select: { name: true }
        });

        // Send to each admin (or use a mailing list if configured)
        const adminLink = `${process.env.NEXT_PUBLIC_APP_URL}/admin/deposits`;
        await Promise.all(admins.map((admin: any) =>
            sendEmail({
                name: data.name,
                email: data.email,
                verification_status: data.verification_status as any,
                status: data.status as any,
                type: data.typemail,
                ...EMAIL_TEMPLATES.DEPOSIT_SUBMITTED_ADMIN(
                    agency?.name || 'Unknown Agency',
                    `€${amount}`,
                    'UPLOADED_PROOF',
                    adminLink
                )
            })
        ));

        return res.status(201).json({ success: true, message: 'Deposit submitted' });

    } catch (error) {
        console.error('Create Deposit Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Need crypto for UUID generation
import crypto from 'crypto';

export default requireAuth(handler);
