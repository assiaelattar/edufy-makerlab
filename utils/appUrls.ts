export interface AppUrlOptions {
  configuredUrl?: string;
  currentHostname: string;
  localUrl: string;
  productionUrl: string;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

export const isLocalHostname = (hostname: string) => LOCAL_HOSTNAMES.has(hostname.toLowerCase());

const normalizeHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

/**
 * Resolve an app URL without ever leaking localhost into a production page.
 * Explicit environment URLs win when they are valid, except that a local-only
 * URL is ignored when the current page itself is running on a public host.
 */
export const resolveAppUrl = ({
  configuredUrl,
  currentHostname,
  localUrl,
  productionUrl,
}: AppUrlOptions) => {
  const currentIsLocal = isLocalHostname(currentHostname);
  const safeLocalUrl = normalizeHttpUrl(localUrl);
  const safeProductionUrl = normalizeHttpUrl(productionUrl);

  if (!safeLocalUrl || !safeProductionUrl) {
    throw new Error('SparkQuest app URL defaults must be valid HTTP(S) URLs.');
  }

  const candidate = configuredUrl?.trim() ? normalizeHttpUrl(configuredUrl.trim()) : null;
  if (candidate) {
    const candidateHostname = new URL(candidate).hostname;
    if (currentIsLocal || !isLocalHostname(candidateHostname)) return candidate;
  }

  return currentIsLocal ? safeLocalUrl : safeProductionUrl;
};
