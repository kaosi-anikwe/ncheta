import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getBookBySlug, getStoreSettings } from "../../../sanity/queries";

export const prerender = false;

interface CartItem {
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  format: "pdf" | "epub" | "physical";
  formatKey: string;
  currency: "NGN" | "USD";
  unitPrice: number;
  quantity: number;
}

interface CheckoutBody {
  items: CartItem[];
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  emailToken: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  dhlQuoteJson?: string;
  shippingCost?: number;
}

export const POST: APIRoute = async ({ request, locals }) => {

  try {
    const body = (await request.json()) as CheckoutBody;
    const { items, customer, emailToken, shippingAddress, dhlQuoteJson, shippingCost = 0 } = body;

    // ── Validate inputs ───────────────────────────────────────────
    if (!items?.length) return json({ success: false, error: "Cart is empty" }, 400);
    if (!customer?.name || !customer?.email) return json({ success: false, error: "Customer name and email required" }, 400);
    if (!emailToken) return json({ success: false, error: "Email verification required" }, 400);

    // Verify email token
    const tokenRow = await env.DB.prepare(
      `SELECT email FROM email_verifications
       WHERE email_token = ? AND email = ? AND verified_at IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(emailToken, customer.email.toLowerCase().trim())
      .first<{ email: string }>();

    if (!tokenRow) {
      return json({ success: false, error: "Email verification expired. Please verify your email again." }, 400);
    }

    const hasPhysical = items.some((i) => i.format === "physical");
    if (hasPhysical && !shippingAddress) {
      return json({ success: false, error: "Shipping address required for physical items" }, 400);
    }

    // ── Determine currency and validate prices ────────────────────
    const currency = items[0].currency as "NGN" | "USD";
    if (!["NGN", "USD"].includes(currency)) return json({ success: false, error: "Invalid currency" }, 400);

    // Validate each item price against Sanity (server-authoritative)
    const validatedItems: Array<CartItem & { r2Key?: string }> = [];
    for (const item of items) {
      const book = await getBookBySlug(item.bookSlug);
      if (!book) return json({ success: false, error: `Book not found: ${item.bookSlug}` }, 400);

      const fmt = book.formats?.find((f) => f._key === item.formatKey);
      if (!fmt) return json({ success: false, error: `Format not found for ${item.bookTitle}` }, 400);

      const serverPrice = fmt.prices?.find((p) => p.currency === currency);
      if (!serverPrice) return json({ success: false, error: `No ${currency} price for ${item.bookTitle}` }, 400);

      if (serverPrice.amount !== item.unitPrice) {
        return json({ success: false, error: `Price mismatch for ${item.bookTitle}. Please refresh your cart.` }, 409);
      }

      validatedItems.push({ ...item, r2Key: fmt.r2Key });
    }

    // ── Fetch store settings ──────────────────────────────────────
    const settings = await getStoreSettings();
    const taxRate = (currency === "NGN" && settings) ? settings.taxRatePercent / 100 : 0;

    // ── Compute totals (all in smallest unit) ────────────────────
    const subtotal = validatedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount + shippingCost;

    // ── Reserve physical stock atomically ────────────────────────
    for (const item of validatedItems.filter((i) => i.format === "physical")) {
      const result = await env.DB.prepare(
        `UPDATE book_inventory
         SET reserved = reserved + ?, updated_at = datetime('now')
         WHERE book_id = ? AND format = 'physical'
           AND (stock - reserved) >= ?`
      )
        .bind(item.quantity, item.bookId, item.quantity)
        .run();

      if (result.meta.rows_written === 0) {
        return json({
          success: false,
          error: `Sorry, "${item.bookTitle}" (physical) just sold out. Please remove it from your cart.`,
        }, 409);
      }
    }

    // ── Snapshot DHL origin from storeSettings ───────────────────
    const dhlOriginSnapshot = settings ? JSON.stringify({
      name: settings.dhlOriginName,
      company: settings.dhlOriginCompany,
      addressLine1: settings.dhlOriginAddressLine1,
      addressLine2: settings.dhlOriginAddressLine2,
      city: settings.dhlOriginCity,
      postalCode: settings.dhlOriginPostalCode,
      countryCode: settings.dhlOriginCountryCode,
    }) : null;

    // ── Create order in D1 ───────────────────────────────────────
    const orderId = crypto.randomUUID();
    const reference = `nch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const orderType = hasPhysical
      ? (validatedItems.some((i) => i.format !== "physical") ? "mixed" : "physical")
      : "digital";

    await env.DB.prepare(
      `INSERT INTO orders (
         id, reference, status, order_type,
         customer_email, customer_name, customer_phone,
         subtotal, shipping_cost, tax_amount, total_amount, currency,
         ship_line1, ship_line2, ship_city, ship_state, ship_country, ship_postal,
         dhl_quote_json, dhl_origin_snapshot_json
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
      .bind(
        orderId, reference, "pending", orderType,
        customer.email.toLowerCase().trim(), customer.name, customer.phone ?? null,
        subtotal, shippingCost, taxAmount, total, currency,
        shippingAddress?.line1 ?? null, shippingAddress?.line2 ?? null,
        shippingAddress?.city ?? null, shippingAddress?.state ?? null,
        shippingAddress?.country ?? null, shippingAddress?.postalCode ?? null,
        dhlQuoteJson ?? null, dhlOriginSnapshot,
      )
      .run();

    // Insert order items
    for (const item of validatedItems) {
      await env.DB.prepare(
        `INSERT INTO order_items (id, order_id, book_id, book_title, book_slug, format, unit_price, quantity, r2_key)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
        .bind(
          crypto.randomUUID(), orderId, item.bookId, item.bookTitle, item.bookSlug,
          item.format, item.unitPrice, item.quantity, item.r2Key ?? null,
        )
        .run();
    }

    // ── Initialise Paystack transaction ──────────────────────────
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: customer.email.toLowerCase().trim(),
        amount: total,
        currency,
        reference,
        callback_url: `${new URL(request.url).origin}/store/order/${reference}`,
        metadata: {
          order_id: orderId,
          order_type: orderType,
          customer_name: customer.name,
        },
      }),
    });

    if (!paystackRes.ok) {
      const err = await paystackRes.json().catch(() => ({}));
      console.error("Paystack init error:", err);
      // Release any reserved stock on failure
      for (const item of validatedItems.filter((i) => i.format === "physical")) {
        await env.DB.prepare(
          `UPDATE book_inventory SET reserved = MAX(0, reserved - ?), updated_at = datetime('now')
           WHERE book_id = ? AND format = 'physical'`
        ).bind(item.quantity, item.bookId).run();
      }
      await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").bind(orderId).run();
      return json({ success: false, error: "Payment initialisation failed. Please try again." }, 502);
    }

    const paystackData = await paystackRes.json() as {
      status: boolean;
      data: { authorization_url: string; access_code: string; reference: string };
    };

    // Store access code for later use
    await env.DB.prepare(
      "UPDATE orders SET paystack_access_code = ? WHERE id = ?"
    ).bind(paystackData.data.access_code, orderId).run();

    return json({
      success: true,
      orderId,
      reference,
      authorizationUrl: paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code,
    });
  } catch (err) {
    console.error("checkout error:", err);
    return json({ success: false, error: "Internal error. Please try again." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
