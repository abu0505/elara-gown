const CLOUD_NAME = "dsk80upna";
const UPLOAD_PRESET = "elara_gowns_unsigned";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    bytes: number;
}

/**
 * Check if a URL is already hosted on Cloudinary (skip re-upload).
 */
export function isCloudinaryUrl(url: string): boolean {
    return url.includes("res.cloudinary.com") || url.includes("cloudinary.com/");
}

/**
 * Uploads a compressed image blob to Cloudinary using unsigned upload.
 * Returns the secure URL and metadata.
 */
export async function uploadToCloudinary(blob: Blob): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append("file", blob);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Cloudinary upload failed (${response.status})`);
    }

    const data = await response.json();

    return {
        secure_url: data.secure_url,
        public_id: data.public_id,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
    };
}

/**
 * Uploads an image to Cloudinary by passing a remote URL directly.
 * Cloudinary's servers fetch the image — eliminates the browser download step.
 * This is ~2x faster than download-then-upload for each image.
 */
export async function uploadToCloudinaryByUrl(imageUrl: string): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Cloudinary URL upload failed (${response.status})`);
    }

    const data = await response.json();

    return {
        secure_url: data.secure_url,
        public_id: data.public_id,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
    };
}
