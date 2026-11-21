import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

interface OrderRow {
  id: string; reference: string; status: string; order_type: string;
  customer_email: string; customer_name: string;
  total_amount: number; currency: string;
}

interface OrderItemRow {
  id: string; book_id: string; book_title: string; book_slug: string;
  format: string; unit_price: number; quantity: number; r2_key: string | null;
}

export const POST: APIRoute = async ({ request, locals }) => {

  // Read raw body BEFORE parsing — required for HMAC verification
  const rawBody = await request.text();

  // ── HMAC-SHA512 signature verification ───────────────────────
  const signature = request.headers.get("x-paystack-signature");
  if (!signature || !env.PAYSTACK_WEBHOOK_SECRET) {
    return new Response(null, { status: 403 });
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.PAYSTACK_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", keyMaterial, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expected !== signature) {
    return new Response(null, { status: 403 });
  }

  // ── Parse event ───────────────────────────────────────────────
  let payload: { id?: string; event: string; data: { reference?: string; status?: string; amount?: number } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400 });
  }

  const eventId = payload.id ? String(payload.id) : `${payload.event}:${payload.data.reference}`;

  // ── Idempotency check ─────────────────────────────────────────
  const existing = await env.DB.prepare(
    "SELECT id FROM webhook_events WHERE id = ?"
  ).bind(eventId).first();

  if (existing) {
    // Already processed — respond 200 so Paystack stops retrying
    return new Response(null, { status: 200 });
  }

  // Record event FIRST (before processing) to prevent duplicate processing on concurrent retries
  await env.DB.prepare(
    "INSERT OR IGNORE INTO webhook_events (id, event_type, payload_json) VALUES (?,?,?)"
  ).bind(eventId, payload.event, rawBody).run();

  // ── Handle events ─────────────────────────────────────────────
  if (payload.event === "charge.success") {
    const reference = payload.data.reference;
    if (reference) {
      try {
        await processPaymentSuccess(env, reference);
      } catch (err) {
        console.error("Webhook processing error:", err);
        // Don't re-throw — always respond 200 to Paystack
      }
    }
  }

  if (payload.event === "refund.processed") {
    const reference = payload.data.reference;
    if (reference) {
      await env.DB.prepare(
        "UPDATE orders SET status = 'refunded', updated_at = datetime('now') WHERE reference = ?"
      ).bind(reference).run().catch(() => {});
    }
  }

  // Always respond 200 to prevent Paystack retry storms
  return new Response(null, { status: 200 });
};

async function processPaymentSuccess(env: Env, reference: string) {
  const order = await env.DB.prepare(
    "SELECT id, reference, status, order_type, customer_email, customer_name, total_amount, currency FROM orders WHERE reference = ?"
  ).bind(reference).first<OrderRow>();

  if (!order || order.status === "paid") return; // Already processed or not found

  await env.DB.prepare(
    "UPDATE orders SET status = 'paid', paystack_reference = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(reference, order.id).run();

  const items = await env.DB.prepare(
    "SELECT id, book_id, book_title, book_slug, format, unit_price, quantity, r2_key FROM order_items WHERE order_id = ?"
  ).bind(order.id).all<OrderItemRow>();

  // Convert reserved stock → sold for physical items
  for (const item of items.results.filter((i) => i.format === "physical")) {
    await env.DB.prepare(
      `UPDATE book_inventory
       SET stock = MAX(0, stock - ?), reserved = MAX(0, reserved - ?), sold = sold + ?, updated_at = datetime('now')
       WHERE book_id = ? AND format = 'physical'`
    ).bind(item.quantity, item.quantity, item.quantity, item.book_id).run();
  }

  // Generate download tokens for digital items
  let downloadExpiryHours = 72;
  let maxDownloads = 3;
  try {
    const { getStoreSettings } = await import("../../../sanity/queries");
    const settings = await getStoreSettings();
    if (settings) {
      downloadExpiryHours = settings.downloadTokenExpiryHours;
      maxDownloads = settings.maxDownloadsPerToken;
    }
  } catch {}

  for (const item of items.results.filter((i) => i.format !== "physical" && i.r2_key)) {
    const expiresAt = new Date(Date.now() + downloadExpiryHours * 60 * 60 * 1000).toISOString();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO download_tokens (id, order_item_id, order_id, r2_key, book_title, format, customer_email, max_downloads, expires_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(
      crypto.randomUUID(), item.id, order.id, item.r2_key!,
      item.book_title, item.format, order.customer_email,
      maxDownloads, expiresAt,
    ).run();
  }

  // Send confirmation emails
  try {
    const { sendOrderConfirmationEmail } = await import("../../../lib/email");
    await sendOrderConfirmationEmail(env, order, items.results, downloadExpiryHours);
  } catch (err) {
    console.error("Webhook email error:", err);
  }
}
