/**
 * API keys from the environment. Hosting dashboards make it easy to paste a key with a stray
 * space, line break, or quote marks, which the APIs reject, so those are removed here.
 */
export function cleanKey(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/^["']+|["']+$/g, '').trim();
}

/** Shows only the start and end of a key, so it can be checked without revealing it. */
export function maskKey(key: string): string {
  return key.length > 12 ? `${key.slice(0, 7)}…${key.slice(-4)} (${key.length} characters)` : key ? `(${key.length} characters)` : '(not set)';
}
