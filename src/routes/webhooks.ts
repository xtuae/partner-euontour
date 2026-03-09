import { prisma } from '../lib/db/prisma.js';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import { sendEmail, EMAIL_TEMPLATES } from '../lib/email.js';

export async function webhookRoutes(req: Request, path: string) {
    const parts = path.split('/').filter(Boolean);

    // POST /webhooks/wp-tours
    if (parts.length === 2 && parts[1] === 'wp-tours' && req.method === 'POST') {
        const secret = req.headers.get('x-webhook-secret');
        if (!process.env.WP_WEBHOOK_SECRET || secret !== process.env.WP_WEBHOOK_SECRET) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let data: any = {};
        let finalImageUrl: string | null = null;

        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            data.wp_tour_id = parseInt(formData.get('wp_tour_id') as string, 10);
            data.name = formData.get('name') as string;
            data.price = parseFloat(formData.get('price') as string);
            data.active = formData.get('active') !== 'false';

            const imageFile = formData.get('image') as File | null;
            if (imageFile) {
                const buf = Buffer.from(await imageFile.arrayBuffer());
                const blob = await put(`tours/${data.wp_tour_id}-${crypto.randomUUID()}.jpg`, buf, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN
                });
                finalImageUrl = blob.url;
            } else {
                finalImageUrl = formData.get('image_url') as string || null;
            }
        } else {
            data = await req.json();
            if (data.image_buffer) {
                const buf = Buffer.from(data.image_buffer, 'base64');
                const blob = await put(`tours/${data.wp_tour_id}-${crypto.randomUUID()}.jpg`, buf, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN
                });
                finalImageUrl = blob.url;
            } else {
                finalImageUrl = data.image_url || null;
            }
        }

        if (!data.wp_tour_id || !data.name || isNaN(data.price)) {
            return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const tour = await prisma.tour.upsert({
            where: { wp_tour_id: data.wp_tour_id },
            update: {
                name: data.name,
                price: data.price,
                active: data.active,
                ...(finalImageUrl ? { image_url: finalImageUrl } : {})
            },
            create: {
                wp_tour_id: data.wp_tour_id,
                name: data.name,
                price: data.price,
                active: data.active ?? true,
                image_url: finalImageUrl
            }
        });

        return Response.json({ success: true, tour });
    }

    // POST /webhooks/payments (For Milestone 3)
    if (parts.length === 2 && parts[1] === 'payments' && req.method === 'POST') {
        const body = await req.json();
        const { transactionId, agencyId, amount, currency, status } = body;

        if (status !== 'succeeded') {
            return Response.json({ received: true });
        }

        const depositId = crypto.randomUUID();

        const [agency, deposit] = await prisma.$transaction(async (tx) => {
            const newDeposit = await tx.deposit.create({
                data: {
                    id: depositId,
                    agency_id: agencyId,
                    amount: parseFloat(amount),
                    bank_reference: transactionId,
                    status: 'APPROVED',
                    reviewed_by: 'SYSTEM',
                    reviewed_at: new Date()
                } as any
            });

            await tx.walletLedger.create({
                data: {
                    agency_id: agencyId,
                    type: 'CREDIT',
                    amount: parseFloat(amount),
                    reference_type: 'ONLINE_PAYMENT',
                    reference_id: depositId,
                    description: 'Online Wallet Top-up'
                }
            });

            const updatedAgency = await tx.agency.update({
                where: { id: agencyId },
                data: { wallet_balance: { increment: parseFloat(amount) } }
            });

            return [updatedAgency, newDeposit];
        });

        await prisma.auditLog.create({
            data: {
                actorId: 'SYSTEM', actorRole: 'UNKNOWN',
                action: 'ONLINE_PAYMENT_APPROVED',
                entityType: 'DEPOSIT',
                entityId: depositId,
                details: { transactionId, agencyId }
            }
        });

        const owner = await prisma.user.findFirst({ where: { agency_id: agencyId, role: 'AGENCY' } });
        if (owner) {
            await sendEmail({
                to: owner.email,
                ...EMAIL_TEMPLATES.DEPOSIT_APPROVED(
                    agency.name,
                    amount.toString(),
                    agency.wallet_balance.toString(),
                    new Date().toISOString()
                )
            });
        }

        return Response.json({ success: true, depositId });
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });
}
