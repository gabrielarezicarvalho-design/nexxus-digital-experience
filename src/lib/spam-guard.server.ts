import { sha256Hex } from './keys.server';
import { SPAM_WINDOW_MS } from './plan-models';

// Returns true when the same key already sent an identical body in the current window.
export async function isRepeatedRequest(db: any, keyId: string, body: unknown, now = Date.now()) {
  const fingerprint = await sha256Hex(JSON.stringify(body));
  const bucket = Math.floor(now / SPAM_WINDOW_MS);
  const { error } = await db.from('key_spam_fingerprints').insert({ api_key_id: keyId, fingerprint, bucket });
  if (Math.random() < 0.02) await db.from('key_spam_fingerprints').delete().lt('created_at', new Date(now - 3_600_000).toISOString());
  return error?.code === '23505';
}
