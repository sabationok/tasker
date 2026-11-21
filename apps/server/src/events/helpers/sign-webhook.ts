import { createHmac } from 'node:crypto';

/**
 * Mia's signed-request rule: `X-Connector-Signature = hex(HMAC-SHA256(secret, "<ts>.<raw body>"))`, where
 * `secret = HMAC-SHA256(key = 'webhook', message = apiKey)` as raw bytes (stored as hex in `api_keys.webhook_secret`).
 */
export function signWebhook(webhookSecretHex: string, ts: number, body: string): string {
  return createHmac('sha256', Buffer.from(webhookSecretHex, 'hex')).update(`${ts}.${body}`).digest('hex');
}
