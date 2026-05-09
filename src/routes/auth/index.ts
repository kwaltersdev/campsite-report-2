import { Hono } from "hono";
import { login, sessionCookieOptions, updatePassword, invalidateSession } from "../../auth/auth";
import { serializeCookie, parseCookies } from "../../cookies";

const authApp = new Hono<{ Variables: { userId: string | null; }; }>();

const isProduction = process.env.NODE_ENV === 'production';

authApp.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const username = body.username as string;
  const password = body.password as string;
  const userAgent = c.req.header('User-Agent');

  const result = await login(username, password, userAgent ?? undefined);
  if (!result) {
    return c.json({ ok: false }, 401);
  }

  c.header(
    'Set-Cookie',
    serializeCookie('session_id', result.sessionId, {
      ...sessionCookieOptions(isProduction),
      path: '/',
    })
  );
  return c.json({ ok: true, mustResetPassword: result.mustResetPassword });
});

authApp.post('/logout', async (c) => {
  const cookies = parseCookies(c.req.header('Cookie') ?? c.req.header('cookie') ?? '');
  const sessionId = cookies.session_id;
  if (sessionId) {
    await invalidateSession(sessionId);
  }

  c.header(
    'Set-Cookie',
    serializeCookie('session_id', '', {
      ...sessionCookieOptions(isProduction),
      maxAge: 0,
      path: '/',
    })
  );

  return c.json({ ok: true });
});

authApp.post('/reset-password', async (c) => {
  const userId = c.get('userId') as string | null;
  if (!userId) {
    return c.json({ ok: false }, 401);
  }

  const body = await c.req.parseBody();
  const newPassword = body.newPassword as string;
  if (!newPassword) {
    return c.json({ ok: false }, 400);
  }

  await updatePassword(userId, newPassword);
  return c.json({ ok: true });
});

export default authApp;
