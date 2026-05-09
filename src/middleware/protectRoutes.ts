import { Context, Next } from "hono";
import { getSession } from "../auth/auth";
import { parseCookies } from "../cookies";
import { AuthUserDAO } from "../db/data-access/auth/AuthUser";


export default async function (c: Context, next: Next) {
  const cookies = parseCookies(c.req.header('Cookie') ?? c.req.header('cookie') ?? '');
  const sessionId = cookies.session_id;
  const userAgent = c.req.header('User-Agent');
  const session = sessionId ? await getSession(sessionId, userAgent ?? undefined) : null;
  c.set("userId", session?.userId ?? null);

  const pathName = new URL(c.req.url, 'http://localhost').pathname;
  const isStylesheet = pathName === '/styles.css';

  const isPublicRoute =
    pathName === '/login' ||
    isStylesheet ||
    pathName.startsWith('/auth/');

  if (!session && !isPublicRoute) {
    return c.redirect('/login');
  }

  // If user is logged in but must reset password, force them to reset-password page
  if (session && !isStylesheet && pathName !== '/reset-password' && pathName !== '/auth/reset-password') {
    if (await AuthUserDAO.findMustResetPasswordById(session.userId)) {
      return c.redirect('/reset-password');
    }
  }

  return next();
}