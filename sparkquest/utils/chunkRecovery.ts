const RECOVERY_KEY = 'sparkquest_chunk_reload_at';
const RECOVERY_WINDOW_MS = 2 * 60 * 1000;

let reloadRequested = false;

export const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload (?:css|javascript)|chunkloaderror|expected a javascript module script/i.test(message);
};

// A tab opened before a deployment can still request a chunk from the old build.
// Reload its document once so the new entry point supplies the current chunk names.
export const recoverFromChunkError = (): boolean => {
  if (reloadRequested) return true;

  try {
    const now = Date.now();
    const lastAttempt = Number(window.sessionStorage.getItem(RECOVERY_KEY));
    if (lastAttempt && now - lastAttempt < RECOVERY_WINDOW_MS) return false;
    window.sessionStorage.setItem(RECOVERY_KEY, String(now));
  } catch {
    // Without a persistent guard, an automatic reload could loop indefinitely.
    return false;
  }

  reloadRequested = true;
  window.location.reload();
  return true;
};
