import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export const POST: APIRoute = async (context) => {

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return json({ success: false, error: "Invalid request" }, 400);
  }

  const bookId = (form.get("book_id") as string | null)?.trim();
  const format = (form.get("format") as string | null)?.trim();
  const file = form.get("file") as File | null;

  if (!bookId || !format || !file) {
    return json({ success: false, error: "Missing required fields" }, 400);
  }

  if (!["pdf", "epub"].includes(format)) {
    return json({ success: false, error: "type" }, 400);
  }

  const allowedTypes = ["application/pdf", "application/epub+zip"];
  if (file.size > MAX_SIZE) return json({ success: false, error: "size" }, 413);
  if (!allowedTypes.includes(file.type) && file.type !== "") {
    // Some browsers send empty type — accept and rely on file extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "epub") return json({ success: false, error: "type" }, 400);
  }

  // Fetch book slug from Sanity
  const { sanityClient } = await import("../../../../sanity/client");
  const book = await sanityClient.fetch(
    `*[_type == "book" && _id == $id][0]{ _id, slug }`,
    { id: bookId }
  ) as { _id: string; slug: { current: string } } | null;

  if (!book) return json({ success: false, error: "book" }, 404);

  const ext = format === "epub" ? "epub" : "pdf";
  const r2Key = `books/${book.slug.current}/${format}.${ext}`;
  const contentType = format === "epub" ? "application/epub+zip" : "application/pdf";

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await env.BOOKS_BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType },
  });

  // Write R2 key back to Sanity using write client
  try {
    const { createClient } = await import("@sanity/client");
    const writeClient = createClient({
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || "fn5p79dp",
      dataset: import.meta.env.PUBLIC_SANITY_DATASET || "production",
      apiVersion: import.meta.env.PUBLIC_SANITY_API_VERSION || "2026-07-02",
      token: env.SANITY_WRITE_TOKEN,
      useCdn: false,
    });

    // Fetch current formats to find the right array index
    const bookData = await writeClient.fetch<{ formats?: Array<{ format: string; r2Key?: string }> }>(
      `*[_id == $id][0]{ formats }`,
      { id: bookId }
    );

    const formats = bookData?.formats ?? [];
    const idx = formats.findIndex((f) => f.format === format);

    if (idx !== -1) {
      await writeClient
        .patch(bookId)
        .set({ [`formats[${idx}].r2Key`]: r2Key })
        .commit();
    }
  } catch (err) {
    console.error("Sanity patch error:", err);
    // R2 upload succeeded — don't fail the response; the PO can manually set r2Key in Sanity
  }

  return json({ success: true, r2Key });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
