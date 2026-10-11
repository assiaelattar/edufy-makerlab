export interface ProjectVisualInput {
  thumbnailUrl?: string;
  coverImage?: string;
  gallery?: string[];
  mediaUrls?: string[];
}

export const isSafeProjectImage = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim()) return false;
  const url = value.trim();
  return url.startsWith('/') || url.startsWith('https://') || url.startsWith('http://') ||
    url.startsWith('blob:') || url.startsWith('data:image/');
};

export const projectEvidenceImages = (project: ProjectVisualInput): string[] =>
  [...new Set([...(project.gallery || []), ...(project.mediaUrls || [])].filter(isSafeProjectImage))];

export const resolveParentProjectImage = (project: ProjectVisualInput, templateImage?: string): string | null =>
  [project.thumbnailUrl, project.coverImage, ...projectEvidenceImages(project), templateImage]
    .find(isSafeProjectImage) || null;
