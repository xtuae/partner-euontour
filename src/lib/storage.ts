import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import fs from 'fs';

// Helper to read file to buffer if it's a formidable File
async function getBuffer(file: any): Promise<Buffer> {
    if (file.buffer) return file.buffer; // If already buffer
    if (file.filepath) return fs.promises.readFile(file.filepath); // Formidable
    throw new Error('Invalid file object');
}

export interface UploadResult {
    url: string;
    thumbnailUrl?: string | null;
}

export async function uploadFile(file: any, folder: string, filename?: string): Promise<UploadResult> {
    const buffer = await getBuffer(file);
    const originalName = file.originalFilename || 'file';
    const ext = originalName.split('.').pop()?.toLowerCase();

    // Determine Type
    const isPdf = file.mimetype === 'application/pdf' || ext === 'pdf';
    const isImage = file.mimetype?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');

    let finalBuffer = buffer;
    let contentType = file.mimetype || 'application/octet-stream';
    let thumbnailUrl: string | null = null;

    if (isImage) {
        // Compress Image
        try {
            // Dynamic import sharp to avoid build issues if not present in all environments (though we installed it)
            const sharp = (await import('sharp')).default;
            finalBuffer = await sharp(buffer)
                .rotate()
                .resize({ width: 1600, withoutEnlargement: true })
                .jpeg({ quality: 75 })
                .toBuffer();
            contentType = 'image/jpeg';
        } catch (e) {
            console.warn('Image compression failed, uploading original', e);
        }
    } else if (isPdf) {
        // Generate Thumbnail
        try {
            const { PDFDocument } = await import('pdf-lib');
            const { createCanvas } = await import('canvas');

            const pdf = await PDFDocument.load(buffer);
            const page = pdf.getPage(0);
            const { width, height } = page.getSize();
            const scale = 0.5;

            const canvas = createCanvas(width * scale, height * scale);
            const ctx = canvas.getContext("2d");

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#000";
            ctx.font = "24px sans-serif";
            ctx.fillText("PDF Preview", 40, 60);
            ctx.font = "16px sans-serif";
            ctx.fillText(originalName.substring(0, 20), 40, 90);

            const thumbBuffer = canvas.toBuffer("image/jpeg");

            const thumbBlob = await put(`${folder}/thumb-${randomUUID()}.jpg`, thumbBuffer, {
                access: 'private',
                contentType: 'image/jpeg',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });
            thumbnailUrl = thumbBlob.url;

        } catch (e) {
            console.warn('PDF Thumbnail generation failed', e);
        }
    }

    const name = filename || `${randomUUID()}.${isImage ? 'jpg' : ext}`;
    const blob = await put(`${folder}/${name}`, finalBuffer, {
        access: 'private',
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return {
        url: blob.url,
        thumbnailUrl
    };
}
