import type { APIRoute } from "astro";
import { sendEmail, sendOrderConfirmationEmail, sendDispatchEmail } from "../../../lib/email";

export const prerender = false;

// Protected by middleware — only reachable when admin session cookie is valid

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;

  let body: { type?: string; to?: string };
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "JSON body required" }, 400);
  }

  const { type, to } = body;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return json({ success: false, error: "Valid 'to' email required" }, 400);
  }

  const fakeOrderBase = {
    id: "test-order-id",
    reference: "nch_test_000000",
    status: "paid",
    customer_email: to,
    customer_name: "Amaka Okonkwo",
    total_amount: 750000,
    currency: "NGN",
  };

  const fakeDigitalItems = [
    { id: "item-1", book_title: "Echoes of the Niger Delta", book_slug: "echoes-of-the-niger-delta", format: "pdf", unit_price: 500000, quantity: 1, r2_key: "books/echoes/pdf.pdf" },
  ];

  const fakePhysicalItems = [
    { id: "item-2", book_title: "Portraits of the Sahel", book_slug: "portraits-of-the-sahel", format: "physical", unit_price: 750000, quantity: 1, r2_key: null },
  ];

  const fakeMixedItems = [...fakeDigitalItems, ...fakePhysicalItems];

  try {
    switch (type) {
      case "otp": {
        await sendEmail(env, {
          to,
          subject: "Your Ncheta verification code",
          html: `
            <p style="font-family:sans-serif;font-size:16px;color:#181717;">Your Ncheta verification code is:</p>
            <p style="font-family:monospace;font-size:36px;font-weight:bold;letter-spacing:8px;color:#630000;margin:16px 0;">482917</p>
            <p style="font-family:sans-serif;font-size:14px;color:#666;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
          `,
          text: "Your Ncheta verification code is: 482917\n\nThis code expires in 10 minutes.",
        });
        break;
      }

      case "confirmation_digital": {
        // Stub DB for download token lookup — returns a fake token
        const stubEnv = makeStubEnv(env, to, "pdf");
        await sendOrderConfirmationEmail(
          stubEnv,
          { ...fakeOrderBase, order_type: "digital" },
          fakeDigitalItems,
          72,
        );
        break;
      }

      case "confirmation_physical": {
        const stubEnv = makeStubEnv(env, to, null);
        await sendOrderConfirmationEmail(
          stubEnv,
          { ...fakeOrderBase, order_type: "physical", total_amount: 750000 },
          fakePhysicalItems,
          72,
        );
        break;
      }

      case "confirmation_mixed": {
        const stubEnv = makeStubEnv(env, to, "pdf");
        await sendOrderConfirmationEmail(
          stubEnv,
          { ...fakeOrderBase, order_type: "mixed", total_amount: 1250000 },
          fakeMixedItems,
          72,
        );
        break;
      }

      case "dispatch": {
        await sendDispatchEmail(
          env,
          { reference: "nch_test_000000", customer_name: "Amaka Okonkwo", customer_email: to, ship_country: "Nigeria" },
          "1234567890",
        );
        break;
      }

      default:
        return json({
          success: false,
          error: "Unknown type. Valid types: otp, confirmation_digital, confirmation_physical, confirmation_mixed, dispatch",
        }, 400);
    }

    return json({ success: true, type, to });
  } catch (err) {
    console.error("test-email error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
};

// Stubs the D1 download_tokens query so sendOrderConfirmationEmail works without real DB rows
function makeStubEnv(env: Env, to: string, format: string | null): Env {
  const fakeTokens = format
    ? [{ id: "test-token-uuid", book_title: "Echoes of the Niger Delta", format, expires_at: new Date(Date.now() + 72 * 3600000).toISOString() }]
    : [];

  return {
    ...env,
    DB: {
      ...env.DB,
      prepare: (sql: string) => {
        // Intercept the download_tokens SELECT; pass everything else to real DB
        if (sql.includes("download_tokens") && sql.includes("order_id")) {
          return {
            bind: () => ({ all: async () => ({ results: fakeTokens }) }),
          } as unknown as ReturnType<typeof env.DB.prepare>;
        }
        // Orders address lookup (ship_* fields)
        if (sql.includes("ship_line1")) {
          return {
            bind: () => ({
              first: async () => ({
                ship_line1: "12 Test Street", ship_line2: null,
                ship_city: "Lagos", ship_state: "Lagos", ship_country: "NG", ship_postal: "100001",
                customer_phone: "+2348000000000",
                dhl_quote_json: JSON.stringify({ serviceName: "EXPRESS WORLDWIDE", currency: "NGN", totalCharge: 2500000, estimatedDaysWithBuffer: 7 }),
                dhl_origin_snapshot_json: null,
              }),
            }),
          } as unknown as ReturnType<typeof env.DB.prepare>;
        }
        return env.DB.prepare(sql);
      },
    } as unknown as Env["DB"],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
