// Cloudflare Pages Function — forwards newsletter signups to Kit (formerly ConvertKit)
interface Env {
  KIT_API_KEY?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  try {
    const { email } = await request.json() as { email: string };

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const kitApiKey = env.KIT_API_KEY;

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
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      console.warn("KIT_API_KEY is not defined in Cloudflare environment variables.");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    return new Response(JSON.stringify({ success: false, error: "Failed to subscribe" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

