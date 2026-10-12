const IMAGE_WIDTHS = [320, 640, 960] as const;
const IMAGE_QUALITY = 65;
const FIREBASE_BUCKETS = ['edufy-makerlab.firebasestorage.app', 'edufy-makerlab.appspot.com'];
const RASTER_FILE = /\.(?:png|jpe?g|webp)$/i;

/** Only optimize our own raster assets and MakerLab Firebase Storage images. */
export const parentImageSources = (source: string, hostname: string): { src: string; srcSet: string } | null => {
  if (!hostname.endsWith('.vercel.app') || !source) return null;
  let allowed = false;
  if (source.startsWith('/') && !source.startsWith('//')) {
    allowed = RASTER_FILE.test(source.split('?')[0]);
  } else {
    try {
      const url = new URL(source);
      const path = decodeURIComponent(url.pathname);
      const filename = path.split('/').pop() || '';
      const possibleRaster = RASTER_FILE.test(filename) || !/\.[a-z0-9]+$/i.test(filename);
      allowed = url.protocol === 'https:' && possibleRaster && (
        (url.hostname === 'firebasestorage.googleapis.com' && FIREBASE_BUCKETS.some(bucket => path.startsWith(`/v0/b/${bucket}/o/`))) ||
        (url.hostname === 'storage.googleapis.com' && FIREBASE_BUCKETS.some(bucket => path.startsWith(`/${bucket}/`)))
      );
    } catch { return null; }
  }
  if (!allowed) return null;
  const urlFor = (width: number) => `/_vercel/image?url=${encodeURIComponent(source)}&w=${width}&q=${IMAGE_QUALITY}`;
  return { src: urlFor(640), srcSet: IMAGE_WIDTHS.map(width => `${urlFor(width)} ${width}w`).join(', ') };
};
