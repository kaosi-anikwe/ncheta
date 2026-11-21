import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const POST: APIRoute = async (context) => {

  const form = await context.request.formData().catch(() => null);
  const bookId = (form?.get("book_id") as string | null)?.trim();

  if (!bookId) return context.redirect("/admin/inventory?error=failed", 302);

  // Safety check: only delete if no pending reservations
  const row = await env.DB.prepare(
    "SELECT book_id, book_slug, reserved FROM book_inventory WHERE book_id = ? AND format = 'physical'"
  ).bind(bookId).first<{ book_id: string; book_slug: string; reserved: number }>();

  if (!row) return context.redirect("/admin/inventory?error=failed", 302);

  if (row.reserved > 0) {
    // Has live pending orders — refuse deletion
    return context.redirect("/admin/inventory?error=reserved", 302);
  }

  await env.DB.prepare(
    "DELETE FROM book_inventory WHERE book_id = ? AND format = 'physical'"
  ).bind(bookId).run();

  return context.redirect(
    `/admin/inventory?deleted=${encodeURIComponent(row.book_slug)}`,
    302,
  );
};
