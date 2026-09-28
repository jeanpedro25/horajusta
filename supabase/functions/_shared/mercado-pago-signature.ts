export interface ParsedMercadoPagoSignature {
  ts: string;
  v1: string;
}

export function parseMercadoPagoSignature(value: string | null): ParsedMercadoPagoSignature | null {
  if (!value) return null;
  const fields = new Map<string, string>();
  for (const part of value.split(',')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    if ((name === 'ts' || name === 'v1') && fields.has(name)) return null;
    fields.set(name, part.slice(separator + 1).trim());
  }

  const ts = fields.get('ts');
  const v1 = fields.get('v1');
  if (!ts || !/^\d+$/.test(ts) || !v1 || !/^[a-f\d]{64}$/i.test(v1)) return null;
  return { ts, v1 };
}

export function buildMercadoPagoManifest(dataId: string, requestId: string, timestamp: string): string {
  return `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
}

export function matchesMercadoPagoDataId(queryId: string, bodyId: string): boolean {
  return Boolean(queryId) && (!bodyId || queryId.toLowerCase() === bodyId.toLowerCase());
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyMercadoPagoSignature(
  secret: string,
  dataId: string,
  requestId: string,
  signatureHeader: string | null,
  nowMs = Date.now(),
): Promise<boolean> {
  const signature = parseMercadoPagoSignature(signatureHeader);
  if (!signature || !isFreshMercadoPagoTimestamp(signature.ts, nowMs)) return false;
  const manifest = buildMercadoPagoManifest(dataId, requestId, signature.ts);
  const expected = await hmacSha256Hex(secret, manifest);
  return safeEqualHex(expected, signature.v1);
}

export function isFreshMercadoPagoTimestamp(value: string, nowMs = Date.now()): boolean {
  if (!/^\d+$/.test(value)) return false;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return false;
  const milliseconds = parsed > 10_000_000_000 ? parsed : parsed * 1000;
  return Math.abs(nowMs - milliseconds) <= 5 * 60 * 1000;
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f\d]*$/i.test(a) || !/^[a-f\d]*$/i.test(b)) return false;
  const left = new TextEncoder().encode(a.toLowerCase());
  const right = new TextEncoder().encode(b.toLowerCase());
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
