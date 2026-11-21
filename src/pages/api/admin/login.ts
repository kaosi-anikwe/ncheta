import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createAdminSession } from "../../../lib/admin-auth";

export const prerender = false;

export const POST: APIRoute = async (context) => {

  let username: string | null = null;
  let password: string | null = null;

  try {
    const form = await context.request.formData();
    username = form.get("username") as string | null;
    password = form.get("password") as string | null;
  } catch {
    return context.redirect("/admin/login?error=1");
  }

  if (!username || !password || username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    return context.redirect("/admin/login?error=1");
  }

  const token = await createAdminSession(env);
  const next = context.url.searchParams.get("next") ?? "/admin/orders";

  context.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/admin",
  });

  return context.redirect(next);
};
