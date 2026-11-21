import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {

  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ success: false, error: "Valid email required" }, 400);
    }

    const normalised = email.toLowerCase().trim();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Insert OTP row (delete any existing unexpired row for this email first)
    await env.DB.prepare(
      "DELETE FROM email_verifications WHERE email = ? AND verified_at IS NULL"
    ).bind(normalised).run();

    await env.DB.prepare(
      "INSERT INTO email_verifications (id, email, code, expires_at) VALUES (?, ?, ?, ?)"
    ).bind(id, normalised, code, expiresAt).run();

    // Send OTP via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
        to: normalised,
        subject: "Your Ncheta verification code",
        text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
        html: `
          <p style="font-family:sans-serif;font-size:16px;color:#181717;">
            Your Ncheta verification code is:
          </p>
          <p style="font-family:monospace;font-size:36px;font-weight:bold;letter-spacing:8px;color:#630000;margin:16px 0;">
            ${code}
          </p>
          <p style="font-family:sans-serif;font-size:14px;color:#666;">
            This code expires in 10 minutes. If you did not request this, ignore this email.
          </p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}));
      console.error("Resend error:", err);
      return json({ success: false, error: "Failed to send verification email" }, 502);
    }

    return json({ success: true });
  } catch (err) {
    console.error("verify-email error:", err);
    return json({ success: false, error: "Internal error" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
