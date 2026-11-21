// Email sending via Resend HTTP API (compatible with Cloudflare Workers)

interface SendParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(env: Env, params: SendParams): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend error ${res.status}: ${JSON.stringify(err)}`);
  }
}

// ── Shared HTML wrapper ───────────────────────────────────────────────────────

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { background:#e7d7b6; color:#181717; font-family:sans-serif; margin:0; padding:0; }
    .wrap { max-width:580px; margin:0 auto; padding:32px 24px; }
    .logo { font-family:Georgia,serif; font-size:22px; font-weight:bold; letter-spacing:2px; color:#181717; text-transform:uppercase; margin-bottom:32px; display:block; }
    .divider { border:none; border-top:1px solid rgba(24,23,23,0.15); margin:24px 0; }
    h1 { font-family:Georgia,serif; font-size:20px; font-weight:bold; margin:0 0 16px; color:#181717; }
    p { font-size:14px; line-height:1.6; color:rgba(24,23,23,0.75); margin:0 0 12px; }
    .btn { display:inline-block; background:#181717; color:#e7d7b6; font-size:13px; font-weight:600; padding:12px 24px; text-decoration:none; letter-spacing:0.5px; }
    .table { width:100%; border-collapse:collapse; margin:16px 0; font-size:13px; }
    .table td { padding:8px 0; border-bottom:1px solid rgba(24,23,23,0.1); vertical-align:top; }
    .table td:last-child { text-align:right; font-weight:600; }
    .footer { margin-top:32px; font-size:12px; color:rgba(24,23,23,0.4); }
    .tag { display:inline-block; background:rgba(24,23,23,0.08); padding:2px 8px; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; }
  </style>
</head>
<body>
  <div class="wrap">
    <span class="logo">Ncheta Magazine</span>
    ${content}
    <hr class="divider" />
    <div class="footer">
      <p>Ncheta Magazine · <a href="https://nchetamagazine.com" style="color:#630000;">nchetamagazine.com</a></p>
      <p>Questions? Email <a href="mailto:hello@nchetamagazine.com" style="color:#630000;">hello@nchetamagazine.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

function formatPrice(amount: number, cur: string): string {
  if (cur === "NGN") return "₦" + (amount / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 });
  return "$" + (amount / 100).toFixed(2);
}

const formatLabels: Record<string, string> = {
  pdf: "Digital — PDF", epub: "Digital — EPUB", physical: "Physical Book",
};

// ── Order confirmation ────────────────────────────────────────────────────────

interface OrderRow {
  id: string; reference: string; status: string; order_type: string;
  customer_email: string; customer_name: string;
  total_amount: number; currency: string;
}

interface OrderItemRow {
  id: string; book_title: string; book_slug: string;
  format: string; unit_price: number; quantity: number; r2_key: string | null;
}

export async function sendOrderConfirmationEmail(
  env: Env,
  order: OrderRow,
  items: OrderItemRow[],
  downloadExpiryHours: number,
): Promise<void> {
  const firstName = order.customer_name.split(" ")[0];
  const hasDigital = items.some((i) => i.format !== "physical");
  const hasPhysical = items.some((i) => i.format === "physical");

  // Fetch download tokens for this order
  const tokens = await env.DB.prepare(
    "SELECT id, book_title, format, expires_at FROM download_tokens WHERE order_id = ? AND expires_at > datetime('now')"
  ).bind(order.id).all<{ id: string; book_title: string; format: string; expires_at: string }>();

  const origin = "https://nchetamagazine.com";
  const orderUrl = `${origin}/store/order/${order.reference}`;

  const itemRows = items.map((item) => `
    <tr>
      <td>${item.book_title} <span style="color:rgba(24,23,23,0.4);font-size:12px;">(${formatLabels[item.format] ?? item.format}${item.quantity > 1 ? " ×" + item.quantity : ""})</span></td>
      <td>${formatPrice(item.unit_price * item.quantity, order.currency)}</td>
    </tr>
  `).join("");

  const downloadSection = hasDigital && tokens.results.length > 0
    ? `<h1 style="margin-top:24px;">Your Downloads</h1>
       <p>Your digital files are ready to download. Each link allows ${env.DB ? "3" : "3"} downloads and expires in ${downloadExpiryHours} hours.</p>
       ${tokens.results.map((t) => `
         <p style="margin-bottom:8px;">
           <strong>${t.book_title}</strong> (${formatLabels[t.format] ?? t.format})<br/>
           <a href="${origin}/api/downloads/${t.id}" class="btn" style="display:inline-block;margin-top:6px;background:#630000;color:#e7d7b6;padding:10px 20px;text-decoration:none;font-size:13px;font-weight:600;">Download Now</a>
         </p>
       `).join("")}
       <p style="font-size:12px;color:rgba(24,23,23,0.5);">
         You can also access your downloads at any time from your <a href="${orderUrl}" style="color:#630000;">order page</a>.
       </p>`
    : "";

  const shippingSection = hasPhysical
    ? `<h1 style="margin-top:24px;">Shipping</h1>
       <p>Your physical book(s) will be dispatched via DHL Express. We'll send you a tracking number once your order is on its way.</p>`
    : "";

  const html = wrapHtml(`
    <h1>Order Confirmed</h1>
    <p>Hi ${firstName},</p>
    <p>Thank you for your purchase! Your order <strong>${order.reference}</strong> has been confirmed.</p>

    <table class="table">
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr><td style="font-weight:600;padding-top:12px;">Total</td><td style="font-weight:700;padding-top:12px;">${formatPrice(order.total_amount, order.currency)}</td></tr>
      </tfoot>
    </table>

    ${downloadSection}
    ${shippingSection}

    <p style="margin-top:24px;">
      <a href="${orderUrl}" class="btn">View Order</a>
    </p>
    <p>Save your order reference: <strong style="font-family:monospace;">${order.reference}</strong></p>
  `);

  const textParts = [
    `Hi ${firstName},`,
    ``,
    `Your Ncheta order ${order.reference} has been confirmed.`,
    `Total: ${formatPrice(order.total_amount, order.currency)}`,
    ``,
    hasDigital && tokens.results.length > 0
      ? `YOUR DOWNLOADS:\n${tokens.results.map((t) => `${t.book_title}: ${origin}/api/downloads/${t.id}`).join("\n")}`
      : "",
    hasPhysical ? `\nYour physical book(s) will be dispatched via DHL Express. We'll email you a tracking number.` : "",
    ``,
    `View your order: ${orderUrl}`,
    ``,
    `Need help? Email hello@nchetamagazine.com`,
  ].filter(Boolean).join("\n");

  await sendEmail(env, {
    to: order.customer_email,
    subject: `Your Ncheta order ${order.reference} is confirmed`,
    html,
    text: textParts,
  });

  // Send PO notification for physical orders
  if (hasPhysical && env.STORE_PO_EMAIL) {
    await sendPoNotification(env, order, items);
  }
}

// ── PO notification for new physical orders ──────────────────────────────────

async function sendPoNotification(env: Env, order: OrderRow, items: OrderItemRow[]): Promise<void> {
  const physicalItems = items.filter((i) => i.format === "physical");
  const itemList = physicalItems.map((i) => `  - ${i.book_title} ×${i.quantity}`).join("\n");

  // Fetch shipping address from D1
  const addr = await env.DB.prepare(
    "SELECT ship_line1, ship_line2, ship_city, ship_state, ship_country, ship_postal, customer_phone, dhl_quote_json, dhl_origin_snapshot_json FROM orders WHERE id = ?"
  ).bind(order.id).first<{
    ship_line1?: string; ship_line2?: string; ship_city?: string;
    ship_state?: string; ship_country?: string; ship_postal?: string;
    customer_phone?: string; dhl_quote_json?: string; dhl_origin_snapshot_json?: string;
  }>();

  const addressLines = [addr?.ship_line1, addr?.ship_line2, addr?.ship_city, addr?.ship_state, addr?.ship_country, addr?.ship_postal]
    .filter(Boolean).join(", ");

  let dhlSummary = "No DHL quote selected";
  if (addr?.dhl_quote_json) {
    try {
      const q = JSON.parse(addr.dhl_quote_json);
      dhlSummary = `${q.serviceName} — ${q.currency} ${(q.totalCharge / 100).toFixed(2)} · ~${q.estimatedDaysWithBuffer} days`;
    } catch {}
  }

  const adminUrl = `https://nchetamagazine.com/admin/orders`;

  const html = wrapHtml(`
    <h1 style="color:#630000;">New Physical Order</h1>
    <p><strong>Order:</strong> ${order.reference}</p>
    <p><strong>Customer:</strong> ${order.customer_name} &lt;${order.customer_email}&gt;${addr?.customer_phone ? ` · ${addr.customer_phone}` : ""}</p>
    <p><strong>Shipping to:</strong> ${addressLines}</p>
    <p><strong>Items:</strong></p>
    <ul>${physicalItems.map((i) => `<li>${i.book_title} ×${i.quantity}</li>`).join("")}</ul>
    <p><strong>DHL Service:</strong> ${dhlSummary}</p>
    <p><strong>Total paid:</strong> ${formatPrice(order.total_amount, order.currency)}</p>
    <p style="margin-top:24px;"><a href="${adminUrl}" class="btn">View in Admin</a></p>
  `);

  const text = [
    `[NCHETA STORE] New Physical Order: ${order.reference}`,
    ``,
    `Customer: ${order.customer_name} <${order.customer_email}>${addr?.customer_phone ? ` | ${addr.customer_phone}` : ""}`,
    `Shipping to: ${addressLines}`,
    ``,
    `Items:`,
    itemList,
    ``,
    `DHL: ${dhlSummary}`,
    `Total paid: ${formatPrice(order.total_amount, order.currency)}`,
    ``,
    `Admin: ${adminUrl}`,
  ].join("\n");

  await sendEmail(env, {
    to: env.STORE_PO_EMAIL,
    subject: `[NCHETA STORE] New physical order: ${order.reference}`,
    html,
    text,
  });
}

// ── Dispatch notification ─────────────────────────────────────────────────────

export async function sendDispatchEmail(
  env: Env,
  order: { reference: string; customer_name: string; customer_email: string; ship_country?: string | null },
  trackingNumber: string | null,
): Promise<void> {
  const firstName = order.customer_name.split(" ")[0];
  const orderUrl = `https://nchetamagazine.com/store/order/${order.reference}`;

  const html = wrapHtml(`
    <h1>Your Order Has Been Dispatched</h1>
    <p>Hi ${firstName},</p>
    <p>Great news — your Ncheta order <strong>${order.reference}</strong> has been dispatched via DHL Express.</p>
    ${trackingNumber ? `<p><strong>Tracking number:</strong> <span style="font-family:monospace;font-size:16px;">${trackingNumber}</span></p>` : ""}
    <p style="margin-top:24px;"><a href="${orderUrl}" class="btn">View Order</a></p>
  `);

  const text = [
    `Hi ${firstName},`,
    ``,
    `Your Ncheta order ${order.reference} has been dispatched via DHL Express.`,
    trackingNumber ? `Tracking number: ${trackingNumber}` : "",
    ``,
    `View your order: ${orderUrl}`,
  ].filter(Boolean).join("\n");

  await sendEmail(env, {
    to: order.customer_email,
    subject: `Your Ncheta order ${order.reference} has been dispatched`,
    html,
    text,
  });
}
