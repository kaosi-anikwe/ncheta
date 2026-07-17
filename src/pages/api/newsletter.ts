// API route — forwards newsletter signups to Kit (formerly ConvertKit)
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Email required" }), { status: 400 });
    }

    // Forward to Kit API v4
    const kitApiKey = import.meta.env.KIT_API_KEY;

    if (kitApiKey) {
      const response = await fetch("https://api.kit.com/v4/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": kitApiKey,
        },
        body: JSON.stringify({
          email_address: email,
          state: "active",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Kit API error:", errorData);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to forward subscription to Kit" }),
          { status: 502 }
        );
      }
    } else {
      console.warn("KIT_API_KEY is not defined in environment variables.");
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    return new Response(JSON.stringify({ success: false, error: "Failed to subscribe" }), { status: 500 });
  }
};