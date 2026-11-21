import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

interface TokenRow {
  id: string;
  r2_key: string;
  book_title: string;
  format: string;
  download_count: number;
  max_downloads: number;
  expires_at: string;
}

export const GET: APIRoute = async ({ params, locals }) => {
  const { token } = params;

  if (!token) return errorPage(400, "Invalid download link.");

  const now = new Date().toISOString();

  const row = await env.DB.prepare(
    "SELECT id, r2_key, book_title, format, download_count, max_downloads, expires_at FROM download_tokens WHERE id = ?"
  ).bind(token).first<TokenRow>();

  if (!row) return errorPage(404, "Download link not found.");
  if (row.expires_at < now) return errorPage(410, "This download link has expired. Contact hello@nchetamagazine.com to request a new one.");
  if (row.download_count >= row.max_downloads) {
    return errorPage(403, "Download limit reached. Contact hello@nchetamagazine.com for assistance.");
  }

  // Atomic increment — prevents race condition double-download
  const updated = await env.DB.prepare(
    `UPDATE download_tokens
     SET download_count = download_count + 1
     WHERE id = ? AND download_count < max_downloads`
  ).bind(token).run();

  if (updated.meta.rows_written === 0) {
    return errorPage(403, "Download limit reached.");
  }

  // Stream file from R2
  const object = await env.BOOKS_BUCKET.get(row.r2_key);
  if (!object) {
    console.error(`R2 object not found: ${row.r2_key}`);
    return errorPage(404, "File not found. Please contact hello@nchetamagazine.com.");
  }

  const ext = row.format === "epub" ? "epub" : "pdf";
  const filename = row.book_title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "-").toLowerCase();

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? (ext === "epub" ? "application/epub+zip" : "application/pdf"),
      "Content-Disposition": `attachment; filename="${filename}.${ext}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

function errorPage(status: number, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Download Error — Ncheta Magazine</title>
  <style>
    body { font-family: 'Inter', sans-serif; background: #e7d7b6; color: #181717; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { max-width: 480px; padding: 2rem; text-align: center; }
    h1 { font-family: 'Cinzel', serif; font-size: 1.5rem; margin-bottom: 1rem; }
    p { opacity: 0.65; line-height: 1.6; }
    a { color: #630000; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Download Error</h1>
    <p>${message}</p>
    <p style="margin-top:1.5rem"><a href="/store">← Back to store</a></p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}
