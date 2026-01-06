import { apiFetch } from './api-client';

export interface UploadResult {
    url: string;
    type: 'image' | 'pdf';
    size: number;
}

export async function uploadDocument(
    file: File,
    category: "kyc" | "deposit"
): Promise<UploadResult> {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);

    // apiFetch should handle FormData correctly (not defined Content-Type, allow browser to set boundary)
    const res = await apiFetch('/api/uploads/document', {
        method: 'POST',
        body: form
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
    }

    return await res.json();
}
