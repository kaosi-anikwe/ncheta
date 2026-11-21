import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const env = locals.runtime.env;
  const bookId = url.searchParams.get("bookId");
  const format = url.searchParams.get("format") ?? "physical";
  const qty = parseInt(url.searchParams.get("qty") ?? "1", 10);

  if (!bookId) {
    return new Response(JSON.stringify({ error: "bookId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (format !== "physical") {
    // Digital formats have unlimited availability
    return new Response(JSON.stringify({ available: 999, sufficient: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const row = await env.DB.prepare(
      "SELECT stock, reserved FROM book_inventory WHERE book_id = ? AND format = 'physical'"
    )
      .bind(bookId)
      .first<{ stock: number; reserved: number }>();

    const available = row ? row.stock - row.reserved : 0;

    return new Response(
      JSON.stringify({ available: Math.max(0, available), sufficient: available >= qty }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("stock-check error:", err);
    return new Response(JSON.stringify({ available: 0, sufficient: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
