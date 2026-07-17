// Cloudflare Pages Function — forwards service inquiries to HubSpot CRM
interface Env {
  HUBSPOT_PORTAL_ID?: string;
  HUBSPOT_FORM_GUID?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  try {
    const data = await request.json() as Record<string, string>;
    const { firstName, lastName, email, serviceType, message } = data;

    const hubspotPortalId = env.HUBSPOT_PORTAL_ID;
    const hubspotFormGuid = env.HUBSPOT_FORM_GUID;

    if (hubspotPortalId && hubspotFormGuid) {
      await fetch(
        `https://api.hsforms.com/submissions/v3/integration/submit/${hubspotPortalId}/${hubspotFormGuid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: [
              { name: "firstname", value: firstName },
              { name: "lastname", value: lastName },
              { name: "email", value: email },
              { name: "service_type", value: serviceType },
              { name: "message", value: message },
            ],
          }),
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Failed to submit" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
