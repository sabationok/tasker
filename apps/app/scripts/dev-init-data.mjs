#!/usr/bin/env node
/**
 * DEV: prints a mini-app URL with a signed `#initData` (contract §5), like Mia opens it.
 *   node scripts/dev-init-data.mjs <batchId> [--key mia] [--base http://127.0.0.1:3109]
 * Signs with TASKER_API_KEY from .env.local, or with the given key ('mia' = the client-header key).
 * sig = HMAC-SHA256(key = hex(HMAC-SHA256('webapp', apiKey)) as bytes, payload JSON bytes); exp = now + 5 min; one-time nonce.
 */
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const batchId = args.find((a) => !a.startsWith('--'));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!batchId) {
  console.error('usage: node scripts/dev-init-data.mjs <batchId> [--key mia] [--base http://127.0.0.1:3109]');
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const apiKey = opt('key') ?? env.TASKER_API_KEY;
const base = opt('base') ?? 'http://127.0.0.1:3109';
const payload = Buffer.from(JSON.stringify({ user: 'dev', batchId, draftIds: [], locale: 'uk', theme: 'light', exp: Math.floor(Date.now() / 1000) + 300, nonce: randomUUID() }));
const secret = Buffer.from(createHmac('sha256', 'webapp').update(apiKey).digest('hex'), 'hex');
const sig = createHmac('sha256', secret).update(payload).digest();
console.log(`${base}/assistant/app/#initData=${payload.toString('base64url')}.${sig.toString('base64url')}`);
