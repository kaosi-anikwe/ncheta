import type { APIRoute } from "astro";

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

export const GET: APIRoute = async ({ url, locals }) => {
  const env = locals.runtime.env;
  const reference = url.searchParams.get("reference");

  if (!reference) return json({ success: false, error: "reference required" }, 400);

  try {
    const order = await env.DB.prepare(
      "SELECT id, reference, status, order_type, customer_email, customer_name, total_amount, currency FROM orders WHERE reference = ?"
    ).bind(reference).first<OrderRow>();

    if (!order) return json({ success: false, error: "Order not found" }, 404);

    // Idempotent — already verified
    if (order.status === "paid") {
      return buildSuccessResponse(env, order);
    }

    // Verify with Paystack
    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    });

    if (!psRes.ok) {
      return json({ success: false, error: "Failed to verify payment" }, 502);
    }

    const psData = await psRes.json() as { status: boolean; data: { status: string; amount: number } };

    if (psData.data.status !== "success") {
      await env.DB.prepare("UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE id = ?").bind(order.id).run();
      return json({ success: false, error: "Payment not completed" }, 400);
    }

    // Mark order paid
    await env.DB.prepare(
      "UPDATE orders SET status = 'paid', paystack_reference = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(reference, order.id).run();

    // Confirm physical stock (convert reserved → sold)
    const items = await env.DB.prepare(
      "SELECT id, book_id, book_title, book_slug, format, unit_price, quantity, r2_key FROM order_items WHERE order_id = ?"
    ).bind(order.id).all<OrderItemRow>();

    for (const item of items.results.filter((i) => i.format === "physical")) {
      await env.DB.prepare(
        `UPDATE book_inventory
         SET stock = MAX(0, stock - ?), reserved = MAX(0, reserved - ?), sold = sold + ?, updated_at = datetime('now')
         WHERE book_id = ? AND format = 'physical'`
      ).bind(item.quantity, item.quantity, item.quantity, item.book_id).run();
    }

    // Generate download tokens for digital items
    const { downloadTokenExpiryHours, maxDownloadsPerToken } = await getStoreSettings(env);
    for (const item of items.results.filter((i) => i.format !== "physical" && i.r2_key)) {
      const expiresAt = new Date(Date.now() + downloadTokenExpiryHours * 60 * 60 * 1000).toISOString();
      await env.DB.prepare(
        `INSERT INTO download_tokens (id, order_item_id, order_id, r2_key, book_title, format, customer_email, max_downloads, expires_at)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).bind(
        crypto.randomUUID(), item.id, order.id, item.r2_key!,
        item.book_title, item.format, order.customer_email,
        maxDownloadsPerToken, expiresAt,
      ).run();
    }

    // Fire-and-forget email (non-blocking)
    env.ctx?.waitUntil?.(sendOrderEmails(env, order, items.results, downloadTokenExpiryHours));

    return buildSuccessResponse(env, { ...order, status: "paid" });
  } catch (err) {
    console.error("verify error:", err);
    return json({ success: false, error: "Internal error" }, 500);
  }
};

async function buildSuccessResponse(env: Env, order: OrderRow) {
  const items = await env.DB.prepare(
    "SELECT id, book_id, book_title, book_slug, format, unit_price, quantity, r2_key FROM order_items WHERE order_id = ?"
  ).bind(order.id).all<OrderItemRow>();

  const tokens = await env.DB.prepare(
    "SELECT id, book_title, format, expires_at, download_count, max_downloads FROM download_tokens WHERE order_id = ? AND expires_at > datetime('now')"
  ).bind(order.id).all<{ id: string; book_title: string; format: string; expires_at: string; download_count: number; max_downloads: number }>();

  const origin = "https://nchetamagazine.com";
  const downloadLinks = tokens.results.map((t) => ({
    bookTitle: t.book_title,
    format: t.format,
    url: `${origin}/api/downloads/${t.id}`,
    expiresAt: t.expires_at,
    downloadsRemaining: t.max_downloads - t.download_count,
  }));

  return json({
    success: true,
    order: {
      reference: order.reference,
      status: order.status,
      orderType: order.order_type,
      total: order.total_amount,
      currency: order.currency,
      customerName: order.customer_name,
      items: items.results,
    },
    downloadLinks,
  });
}

async function getStoreSettings(env: Env) {
  // Minimal settings fetch inline to avoid importing Sanity client in Worker context at runtime
  try {
    const { getStoreSettings: fetchSettings } = await import("../../../sanity/queries");
    const s = await fetchSettings();
    return {
      downloadTokenExpiryHours: s?.downloadTokenExpiryHours ?? 72,
      maxDownloadsPerToken: s?.maxDownloadsPerToken ?? 3,
    };
  } catch {
    return { downloadTokenExpiryHours: 72, maxDownloadsPerToken: 3 };
  }
}

async function sendOrderEmails(env: Env, order: OrderRow, items: OrderItemRow[], tokenExpiryHours: number) {
  // Emails sent asynchronously — failures don't block the payment confirmation response
  try {
    const { sendOrderConfirmationEmail } = await import("../../../lib/email");
    await sendOrderConfirmationEmail(env, order, items, tokenExpiryHours);
  } catch (err) {
    console.error("Email send error:", err);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
