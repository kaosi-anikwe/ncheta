// Stateless admin session tokens — HMAC-SHA256 signed, no D1 lookup needed per request

export async function createAdminSession(env: Env): Promise<string> {
  const expiry = Date.now() + 24 * 60 * 60 * 1000;
  const payload = `admin:${expiry}`;
  const key = await importKey(env.ADMIN_SESSION_SECRET);
  const sig = await crypto.subtle.sign("HMAC", key, enc(payload));
  return b64(payload) + "." + b64arr(new Uint8Array(sig));
}

export async function verifyAdminSession(token: string, env: Env): Promise<boolean> {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return false;
    const payloadB64 = token.slice(0, dot);
    const sigB64 = token.slice(dot + 1);
    const payload = atob(payloadB64);
    const parts = payload.split(":");
    if (parts.length !== 2 || parts[0] !== "admin") return false;
    if (Date.now() > Number(parts[1])) return false;
    const key = await importKey(env.ADMIN_SESSION_SECRET);
    const expected = await crypto.subtle.sign("HMAC", key, enc(payload));
    const actual = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    if (expected.byteLength !== actual.byteLength) return false;
    // Constant-time comparison
    const a = new Uint8Array(expected);
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ actual[i];
    return diff === 0;
  } catch {
    return false;
  }
}

function importKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    enc(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

const enc = (s: string) => new TextEncoder().encode(s);
const b64 = (s: string) => btoa(s);
const b64arr = (a: Uint8Array) => btoa(String.fromCharCode(...a));
