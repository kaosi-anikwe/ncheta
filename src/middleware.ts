import { defineMiddleware } from "astro:middleware";
import { verifyAdminSession } from "./lib/admin-auth";

export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith("/admin")) return next();
  if (context.url.pathname === "/admin/login") return next();

  const cookie = context.cookies.get("admin_session");
  const env = (context.locals as App.Locals).runtime?.env;
  const valid = cookie && env ? await verifyAdminSession(cookie.value, env) : false;

  if (!valid) {
    const next_ = encodeURIComponent(context.url.pathname);
    return context.redirect(`/admin/login?next=${next_}`);
  }

  return next();
});
