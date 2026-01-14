
/**
 * Compresses and resizes an image file.
 * @param file The original image file.
 * @param maxWidth The maximum width of the output image. Defaults to 1200px.
 * @param quality The quality of the output image (0 to 1). Defaults to 0.8.
 * @returns A Promise that resolves to the compressed Blob.
 */
export const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Export to blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Image compression failed'));
                        }
                    },
                    'image/jpeg', // Force JPEG for better compression
                    quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
