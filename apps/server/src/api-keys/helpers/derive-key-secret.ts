import { createHash, createHmac } from 'node:crypto';

/** `HMAC-SHA256(key = purpose, message = apiKey)` as hex — the secret Mia derives from the same key. */
export function deriveKeySecret(purpose: 'webhook' | 'webapp', apiKey: string): string {
  return createHmac('sha256', purpose).update(apiKey).digest('hex');
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
