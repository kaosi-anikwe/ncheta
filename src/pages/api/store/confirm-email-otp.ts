import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {

  try {
    const { email, code } = (await request.json()) as { email?: string; code?: string };

    if (!email || !code) {
      return json({ success: false, error: "Email and code required" }, 400);
    }

    const normalised = email.toLowerCase().trim();
    const now = new Date().toISOString();

    const row = await env.DB.prepare(
      `SELECT id, expires_at FROM email_verifications
       WHERE email = ? AND code = ? AND verified_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(normalised, code.trim(), now)
      .first<{ id: string; expires_at: string }>();

    if (!row) {
      return json({ success: false, error: "Invalid or expired code" }, 400);
    }

    const emailToken = crypto.randomUUID();
    await env.DB.prepare(
      "UPDATE email_verifications SET verified_at = ?, email_token = ? WHERE id = ?"
    )
      .bind(now, emailToken, row.id)
      .run();

    return json({ success: true, emailToken });
  } catch (err) {
    console.error("confirm-email-otp error:", err);
    return json({ success: false, error: "Internal error" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
