// API route — forwards newsletter signups to Beehiiv
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Email required" }), { status: 400 });
    }

    // Forward to Beehiiv v2 API
    const beehiivApiKey = import.meta.env.BEEHIIV_API_KEY;
    const beehiivPublicationId = import.meta.env.BEEHIIV_PUBLICATION_ID;

    if (beehiivApiKey && beehiivPublicationId) {
      await fetch(
        `https://api.beehiiv.com/v2/publications/${beehiivPublicationId}/subscriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${beehiivApiKey}`,
          },
          body: JSON.stringify({ email }),
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Failed to subscribe" }), { status: 500 });
  }
};