import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware/auth.js';
import { prisma } from '../../../src/lib/db/prisma.js';
import { uploadFile } from '../../../src/lib/storage.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../../src/lib/email.js';
import { extractTextFromImage } from '../../../src/lib/ocr.js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // 1. Get User/Agency
    const user = await prisma.user.findUnique({
        where: { id: userToken.userId },
        include: { agency: true }
    });

    if (!user || !user.agency) return res.status(404).json({ error: 'Agency not found' });
    if (!user.email_verified) return res.status(403).json({ error: 'Email verification required' });

    // 2. Parse Form
    const form = formidable({ keepExtensions: true });

    // Promise wrapper for formidable
    const parseForm = () => new Promise<{ fields: formidable.Fields, files: formidable.Files }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });

    try {
        const { fields, files } = await parseForm();

        // Helper to get string
        const getField = (key: string) => Array.isArray(fields[key]) ? fields[key][0] : fields[key] || '';
        const getFile = (key: string) => Array.isArray(files[key]) ? files[key][0] : files[key];

        const fullName = getField('fullName');
        const nationality = getField('nationality');
        const idType = getField('idType');
        const idNumber = getField('idNumber');
        const idExpiryStr = getField('idExpiry');

        const businessDoc = getFile('businessDoc');
        const idFront = getFile('idFront');
        const idBack = getFile('idBack');
        const selfie = getFile('selfie');

        if (!fullName || !nationality || !idType || !idNumber || !idExpiryStr || !idFront || !businessDoc) {
            return res.status(400).json({ error: 'Missing required fields or files' });
        }

        // 3. Upload Files
        const agencyId = user.agency.id;

        // Business Doc
        const businessUpload = await uploadFile(businessDoc, `verification/${agencyId}`, `business_${Date.now()}_${businessDoc.originalFilename}`);
        const businessDocUrl = businessUpload.url;
        const businessThumbnail = businessUpload.thumbnailUrl;

        // Owner ID
        const idFrontUpload = await uploadFile(idFront, `verification/${agencyId}`, `id_front_${Date.now()}_${idFront.originalFilename}`);
        const idFrontUrl = idFrontUpload.url;
        const idFrontThumbnail = idFrontUpload.thumbnailUrl;

        // Optional Files
        let idBackUrl = null, idBackThumbnail = null;
        if (idBack) {
            const up = await uploadFile(idBack, `verification/${agencyId}`, `id_back_${Date.now()}_${idBack.originalFilename}`);
            idBackUrl = up.url;
            idBackThumbnail = up.thumbnailUrl;
        }

        let selfieUrl = null, selfieThumbnail = null;
        if (selfie) {
            const up = await uploadFile(selfie, `verification/${agencyId}`, `selfie_${Date.now()}_${selfie.originalFilename}`);
            selfieUrl = up.url;
            selfieThumbnail = up.thumbnailUrl;
        }

        // 4. Save to DB (Transaction)
        const kycId = await prisma.$transaction(async (tx: any) => {
            // Save Business Doc
            await tx.verificationDocument.create({
                data: {
                    agency_id: agencyId,
                    doc_type: 'TRADE_LICENSE',
                    file_url: businessDocUrl,
                    thumbnail_url: businessThumbnail
                }
            });

            // Save Owner KYC
            const kyc = await tx.agencyOwnerKyc.create({
                data: {
                    agencyId: agencyId,
                    fullName: fullName,
                    nationality: nationality,
                    idType: idType,
                    idNumber: idNumber,
                    idExpiry: new Date(idExpiryStr),
                    idFrontUrl: idFrontUrl,
                    idFrontThumbnail: idFrontThumbnail,
                    idBackUrl: idBackUrl,
                    idBackThumbnail: idBackThumbnail,
                    selfieUrl: selfieUrl,
                    selfieThumbnail: selfieThumbnail,
                    status: 'PENDING',
                    ocrStatus: 'PENDING'
                }
            });

            // Update Agency Status
            await tx.agency.update({
                where: { id: agencyId },
                data: { verification_status: 'UNDER_REVIEW' }
            });

            return kyc.id;
        });

        // 6. Async OCR Trigger (Fire & Forget)
        const runOcr = async () => {
            try {
                // Dynamic import for signed url
                const { getSignedUrl } = await import('@vercel/blob');

                // Helper to get signed url
                const getSigned = async (u: string) => {
                    return getSignedUrl({ url: u, token: process.env.BLOB_READ_WRITE_TOKEN, expiresIn: 300 });
                };

                // Use Thumbnail for OCR if available, else original
                const businessOcrSource = businessThumbnail ? await getSigned(businessThumbnail) : await getSigned(businessDocUrl);
                const idOcrSource = idFrontThumbnail ? await getSigned(idFrontThumbnail) : await getSigned(idFrontUrl);

                const [businessText, idText] = await Promise.all([
                    extractTextFromImage(businessOcrSource).catch(e => { console.error('Bus OCR Fail', e); return ''; }),
                    extractTextFromImage(idOcrSource).catch(e => { console.error('ID OCR Fail', e); return ''; })
                ]);

                await prisma.agencyOwnerKyc.update({
                    where: { id: kycId },
                    data: {
                        businessOcrText: businessText,
                        ownerIdOcrText: idText,
                        ocrStatus: 'COMPLETED',
                        ocrCompletedAt: new Date()
                    }
                });

            } catch (err) {
                console.error("OCR Background Task Failed", err);
                await prisma.agencyOwnerKyc.update({
                    where: { id: kycId },
                    data: { ocrStatus: 'FAILED' }
                });
            }
        };

        // Queue Microtask
        queueMicrotask(runOcr);

        // 5. Notify Admins
        const admins = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            select: { email: true }
        });

        const adminLink = `${process.env.NEXT_PUBLIC_APP_URL}/admin/agency-verifications`;

        for (const admin of admins) {
            await sendEmail({
                to: admin.email,
                ...EMAIL_TEMPLATES.KYC_SUBMITTED_ADMIN(user.agency.name, fullName, new Date().toLocaleString(), adminLink)
            });
        }

        return res.status(200).json({ success: true, message: 'Verification submitted successfully' });

    } catch (error) {
        console.error('KYC Submit Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
