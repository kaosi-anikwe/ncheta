import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  context.cookies.delete("admin_session", { path: "/admin" });
  return context.redirect("/admin/login", 302);
};
