import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env;

  const form = await context.request.formData().catch(() => null);
  if (!form) return context.redirect("/admin/inventory?error=failed", 302);

  const bookId = (form.get("book_id") as string | null)?.trim();
  const bookSlug = (form.get("book_slug") as string | null)?.trim();
  const bookTitle = (form.get("book_title") as string | null)?.trim();
  const action = form.get("action") as string | null;
  const qty = parseInt(form.get("qty") as string, 10);

  if (!bookId || !bookSlug || !action || isNaN(qty) || qty < 0) {
    return context.redirect("/admin/inventory?error=failed", 302);
  }

  try {
    const existing = await env.DB.prepare(
      "SELECT id, stock FROM book_inventory WHERE book_id = ? AND format = 'physical'"
    ).bind(bookId).first<{ id: string; stock: number }>();

    if (action === "add") {
      if (existing) {
        await env.DB.prepare(
          "UPDATE book_inventory SET stock = stock + ?, book_slug = ?, updated_at = datetime('now') WHERE book_id = ? AND format = 'physical'"
        ).bind(qty, bookSlug, bookId).run();
      } else {
        // Initialize — create the row
        await env.DB.prepare(
          `INSERT INTO book_inventory (id, book_id, book_slug, format, stock, reserved, sold)
           VALUES (lower(hex(randomblob(16))), ?, ?, 'physical', ?, 0, 0)`
        ).bind(bookId, bookSlug, qty).run();
      }
    } else if (action === "set") {
      if (!existing) return context.redirect("/admin/inventory?error=not_found", 302);
      // Cannot set stock below currently reserved qty
      const reserved = await env.DB.prepare(
        "SELECT reserved FROM book_inventory WHERE book_id = ? AND format = 'physical'"
      ).bind(bookId).first<{ reserved: number }>();
      const safeQty = Math.max(qty, reserved?.reserved ?? 0);
      await env.DB.prepare(
        "UPDATE book_inventory SET stock = ?, book_slug = ?, updated_at = datetime('now') WHERE book_id = ? AND format = 'physical'"
      ).bind(safeQty, bookSlug, bookId).run();
    } else {
      return context.redirect("/admin/inventory?error=failed", 302);
    }

    const title = encodeURIComponent(bookTitle ?? bookSlug);
    return context.redirect(`/admin/inventory?updated=${title}`, 302);
  } catch (err) {
    console.error("Inventory adjust error:", err);
    return context.redirect("/admin/inventory?error=failed", 302);
  }
};
