import { supabase } from '@/integrations/supabase/client';

const SUPABASE_MARKERS = ['/storage/v1/object/public/', '/storage/v1/object/sign/'];

export function extractSupabasePath(
  fileUrl: string
): { bucket: string; path: string } | null {
  for (const marker of SUPABASE_MARKERS) {
    const idx = fileUrl.indexOf(marker);
    if (idx !== -1) {
      const tail = fileUrl.slice(idx + marker.length).split('?')[0];
      const parts = tail.split('/');
      if (parts.length >= 2) {
        return { bucket: parts[0], path: parts.slice(1).join('/') };
      }
    }
  }
  return null;
}

/**
 * Resolve a note file URL for display/preview. If the URL points at a Supabase
 * Storage object, mint a short-lived signed URL (buckets are private).
 * External URLs (Google Drive, etc.) are returned unchanged.
 */
export async function resolveNoteUrl(
  fileUrl: string | null | undefined,
  expiresInSecs = 3600
): Promise<string | null> {
  if (!fileUrl) return null;
  const loc = extractSupabasePath(fileUrl);
  if (!loc) return fileUrl;
  const { data, error } = await supabase.storage
    .from(loc.bucket)
    .createSignedUrl(loc.path, expiresInSecs);
  if (error) {
    console.error('Failed to sign note URL:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}
