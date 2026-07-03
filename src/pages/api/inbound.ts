// API route — forwards service inquiries to HubSpot CRM
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { firstName, lastName, email, serviceType, message } = data;

    // Forward to HubSpot Free CRM form endpoint
    const hubspotPortalId = import.meta.env.HUBSPOT_PORTAL_ID;
    const hubspotFormGuid = import.meta.env.HUBSPOT_FORM_GUID;

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

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Failed to submit" }), { status: 500 });
  }
};