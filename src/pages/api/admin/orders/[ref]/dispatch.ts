import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { ref } = context.params;

  if (!ref) return context.redirect("/admin/orders", 302);

  const form = await context.request.formData().catch(() => null);
  const trackingNumber = (form?.get("tracking_number") as string | null)?.trim() || null;

  const order = await env.DB.prepare(
    "SELECT id, reference, status, customer_name, customer_email, ship_country FROM orders WHERE reference = ?"
  ).bind(ref).first<{
    id: string; reference: string; status: string;
    customer_name: string; customer_email: string; ship_country: string | null;
  }>();

  if (!order || order.status !== "paid") {
    return context.redirect(`/admin/orders/${ref}?dispatch_error=1`, 302);
  }

  try {
    await env.DB.prepare(
      `UPDATE orders SET status = 'dispatched', tracking_number = ?, dispatched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(trackingNumber, order.id).run();

    // Send dispatch email to customer
    try {
      const { sendDispatchEmail } = await import("../../../../../lib/email");
      await sendDispatchEmail(env, order, trackingNumber);
    } catch (err) {
      console.error("Dispatch email error:", err);
      // Non-fatal — order is still marked dispatched
    }

    return context.redirect(`/admin/orders/${ref}?dispatched=1`, 302);
  } catch (err) {
    console.error("Dispatch error:", err);
    return context.redirect(`/admin/orders/${ref}?dispatch_error=1`, 302);
  }
};
