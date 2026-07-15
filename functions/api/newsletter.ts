// Cloudflare Pages Function — forwards newsletter signups to Beehiiv
interface Env {
  BEEHIIV_API_KEY?: string;
  BEEHIIV_PUBLICATION_ID?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { email } = await request.json() as { email: string };

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const beehiivApiKey = env.BEEHIIV_API_KEY;
    const beehiivPublicationId = env.BEEHIIV_PUBLICATION_ID;

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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Failed to subscribe" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
