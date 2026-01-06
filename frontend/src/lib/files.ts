import { apiFetch } from './api-client';

/**
 * Request a signed URL for a private file (Blob).
 * This is required for accessing KYC documents and Deposit proofs.
 * 
 * @param path - The full URL or pathname of the blob stored in DB (e.g., https://.../foo.jpg)
 * @returns {Promise<string>} - A temporary signed URL (valid for 5 mins)
 */
export async function getSignedFileUrl(path: string): Promise<string> {
    if (!path) return '';

    // Optimization: If path is already a blob URL but not Vercel (e.g. external mock), return as is?
    // But Vercel Blobs are "https://...".
    // We assume all "private" files go through this.

    try {
        const res = await apiFetch(`/api/admin/files/signed-url?path=${encodeURIComponent(path)}`);

        if (res.url) {
            return res.url;
        }
        throw new Error('Failed to sign URL');
    } catch (err) {
        console.error('Error signing URL:', err);
        return ''; // Return empty string or throw? Return empty to avoid crashing UI render.
    }
}
