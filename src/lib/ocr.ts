import vision from "@google-cloud/vision";

// Ensure credentials are provided
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!credentialsJson) {
    console.warn("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON. OCR will fail.");
}

const client = new vision.ImageAnnotatorClient({
    credentials: credentialsJson ? JSON.parse(credentialsJson) : undefined,
});

/**
 * Extracts text from a remote PDF or Image URL using Google Vision API.
 * @param blobUrl - The public or signed URL of the file (Google mostly needs accessible URL or raw buffer)
 * Note: Google Vision API `documentTextDetection` with `source: { imageUri }` requires the image to be publicly accessible 
 * OR Google Cloud Storage URI.
 * Since we use Vercel Blob (private), we successfully generated Signed URLs.
 * Google Vision can fetch from a Signed URL if valid.
 * 
 * Alternatively, we can download the buffer and send it structure.
 * `client.documentTextDetection(buffer)` supports images.
 * For PDFs, `client.batchAnnotateFiles` is needed, but that typically requires GCS for input/output.
 * 
 * CRITICAL: Google Vision `documentTextDetection` works great on IMAGES (JPG/PNG).
 * For PDFs, it's more complex (Async Batch Request -> GCS).
 * 
 * User Prompt says: "High OCR accuracy, Strong PDF support".
 * And usage example: `client.documentTextDetection(blobUrl)`.
 * `documentTextDetection` usually handles Images.
 * If the user uploads PDFs, `extractTextFromPdf` implies handling PDFs.
 * 
 * However, Vercel Blob + Google Vision PDF is tricky without GCS.
 * 
 * STRATEGY:
 * 1. If Image (JPG/PNG): Send Buffer or URL directly to `documentTextDetection`.
 * 2. If PDF: 
 *    Option A: Convert PDF to Image (first page) using `pdf-lib`/`canvas` (which we already do for thumbnails!) and OCR the thumbnail? 
 *    Option B: Use Google Vision PDF support. But that *requires* GCS bucket for Output. We don't have GCS.
 *    
 *    Recommendation: We already generate "thumbnails" (JPGs of first page).
 *    We can OCR the *Thumbnail* (Image) instead of the PDF!
 *    This covers the "ID Card / Passport" use case (usually 1 page).
 *    This is "Production Design" hack that avoids GCS buckets.
 *    
 *    Let's check `api/uploads/document.ts`. We generate thumbnails.
 *    We should store the thumbnail URL in the DB?
 *    We did add `idFrontThumbnail` to Schema.
 *    
 *    Let's try to OCR the *image* provided. If it's a PDF, we might fail or need to OCR the thumbnail.
 *    The `AgencyOwnerKyc` model has `businessDocPath` (file) and `idFrontUrl` (file).
 *    
 *    Let's write a helper that accepts a *Buffer* or *URL* and attempts to detect text.
 *    I'll assume we pass the *Thumbnail URL* or *Image URL* for this implementation to be robust without GCS.
 */
export async function extractTextFromImage(imageBufferOrUrl: string | Buffer) {
    if (!credentialsJson) return "";

    try {
        // documentTextDetection is optimized for dense text (docs). textDetection is for sparse.
        // We use documentTextDetection.
        const [result] = await client.documentTextDetection(imageBufferOrUrl);
        const fullText = result.fullTextAnnotation?.text;

        return fullText || "";
    } catch (error) {
        console.error("OCR Error:", error);
        throw error;
    }
}
