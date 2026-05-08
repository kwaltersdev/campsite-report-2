import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { html } from 'hono/html';
import { HtmlEscapedString } from 'hono/utils/html';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { login, updatePassword, getSession, invalidateSession, sessionCookieOptions } from './auth/auth.js';
import { AuthUserDAO } from './db/data-access/auth/AuthUser.js';
import { CampgroundDAO } from './db/data-access/campgrounds/Campground.js';

const app = new Hono();

function parseCookies(header: string): Record<string, string> {
  return header.split(';').reduce<Record<string, string>>((cookies, pair) => {
    const [name, ...valueParts] = pair.split('=');
    const key = name?.trim();
    if (!key) return cookies;
    const value = valueParts.join('=').trim();
    cookies[decodeURIComponent(key)] = decodeURIComponent(value || '');
    return cookies;
  }, {});
}

function serializeCookie(name: string, value: string, options: Record<string, any> = {}): string {
  const encodedName = encodeURIComponent(name);
  const encodedValue = encodeURIComponent(value);
  const segments = [`${encodedName}=${encodedValue}`];

  if (options.maxAge !== undefined && options.maxAge !== null) {
    segments.push(`Max-Age=${Number(options.maxAge)}`);
  }
  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }
  if (options.path) {
    segments.push(`Path=${options.path}`);
  }
  if (options.sameSite) {
    segments.push(`SameSite=${String(options.sameSite)}`);
  }
  if (options.httpOnly) {
    segments.push('HttpOnly');
  }
  if (options.secure) {
    segments.push('Secure');
  }

  return segments.join('; ');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const getUserId = (c: unknown) => (c as any).get('userId') as string | null;
const setUserId = (c: unknown, value: string | null) => (c as any).set('userId', value);

app.use('*', async (c, next) => {
  const cookies = parseCookies(c.req.header('Cookie') ?? c.req.header('cookie') ?? '');
  const sessionId = cookies.session_id;
  const userAgent = c.req.header('User-Agent');
  const session = sessionId ? await getSession(sessionId, userAgent ?? undefined) : null;
  setUserId(c, session?.userId ?? null);

  const pathName = new URL(c.req.url, 'http://localhost').pathname;
  const isPublicRoute =
    pathName === '/login' ||
    pathName === '/reset-password' ||
    pathName === '/me' ||
    pathName === '/styles.css' ||
    pathName.startsWith('/auth/');

  if (!session && !isPublicRoute) {
    return c.redirect('/login');
  }

  // If user is logged in but must reset password, force them to reset-password page
  if (session && pathName !== '/reset-password' && pathName !== '/auth/reset-password') {
    if (await AuthUserDAO.findMustResetPasswordById(session.userId)) {
      return c.redirect('/reset-password');
    }
  }

  return next();
});

const authApp = new Hono();

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

authApp.post('/reset-password', async (c) => {
  const userId = getUserId(c);
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

app.route('/auth', authApp);

app.get('/me', (c) => {
  return c.json({ userId: getUserId(c) });
});

const sharedHeader = html`
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/add-campground">Add Campground</a>
      <a href="/add-campsite">Add Campsite</a>
      <button id="logout-button" type="button">Logout</button>
    </nav>
  </header>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const logoutButton = document.getElementById('logout-button');
      if (!logoutButton) return;
      logoutButton.addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      });
    });
  </script>
`;

const renderPage = (title: HtmlEscapedString | Promise<HtmlEscapedString>, body: HtmlEscapedString | Promise<HtmlEscapedString>) => html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  ${sharedHeader}
  ${body}
</body>
</html>`;

interface Campsite {
  id: string;
  campgroundId: number;
  name: string;
  hasShade: 1 | 2 | 3;
  isMuddy: 1 | 2 | 3;
  tentCapacity: 1 | 2 | 3;
  levelEasiness: 1 | 2 | 3;
  notes: string;
}

const campsites: Campsite[] = [];

app.get('/', async (c) => {
  const campgrounds = await CampgroundDAO.findAll();
  return c.html(
    renderPage(
      html`Campsite Report`,
      html`<h1>Campsite Report</h1>
      <p>Welcome to the Campsite Report app!</p>
      <h2>Campgrounds</h2>
      <ul>
        ${campgrounds.map(camp => html`<li><a href="/campground/${camp.id}">${camp.name}</a></li>`)}
      </ul>`
    )
  );
});
app.get('/login', (c) =>
  c.html(
    renderPage(
      html`Login`,
      html`<h1>Login</h1>
      <form id="login-form">
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" required><br><br>

        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required><br><br>

        <button type="submit">Sign In</button>
      </form>
      <p id="login-error" style="color: red; display: none;"></p>
      <script>
        const form = document.getElementById('login-form');
        const error = document.getElementById('login-error');
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const formData = new FormData(form);
          const response = await fetch('/auth/login', {
            method: 'POST',
            body: formData,
          });
          const body = await response.json();
          if (!body.ok) {
            error.textContent = 'Invalid username or password.';
            error.style.display = 'block';
            return;
          }
          if (body.mustResetPassword) {
            window.location.href = '/reset-password';
          } else {
            window.location.href = '/';
          }
        });
      </script>`
    )
  )
);

app.get('/reset-password', (c) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.redirect('/login');
  }

  return c.html(
    renderPage(
      html`Reset Password`,
      html`<h1>Reset Password</h1>
      <form id="reset-password-form">
        <label for="newPassword">New Password:</label>
        <input type="password" id="newPassword" name="newPassword" required><br><br>

        <label for="confirmPassword">Confirm Password:</label>
        <input type="password" id="confirmPassword" name="confirmPassword" required><br><br>

        <button type="submit">Save Password</button>
      </form>
      <p id="reset-error" style="color: red; display: none;"></p>
      <script>
        const form = document.getElementById('reset-password-form');
        const error = document.getElementById('reset-error');
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const newPassword = document.getElementById('newPassword').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          if (newPassword !== confirmPassword) {
            error.textContent = 'Passwords do not match.';
            error.style.display = 'block';
            return;
          }
          const formData = new FormData(form);
          const response = await fetch('/auth/reset-password', {
            method: 'POST',
            body: formData,
          });
          const body = await response.json();
          if (!body.ok) {
            error.textContent = 'Unable to update password.';
            error.style.display = 'block';
            return;
          }
          window.location.href = '/';
        });
      </script>`
    )
  );
});


app.get('/add-campground', (c) =>
  c.html(
    renderPage(
      html`Add Campground`,
      html`<h1>Add New Campground</h1>
      <form method="post" action="/add-campground">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" required><br><br>
        <button type="submit">Add Campground</button>
      </form>
      <br>
      <a href="/">Back to Home</a>`
    )
  )
);

app.post('/add-campground', async (c) => {
  const body = await c.req.parseBody();
  const name = body.name as string;
  if (name) {
    await CampgroundDAO.create(name);
  }
  return c.redirect('/');
});

app.get('/campground/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const campground = await CampgroundDAO.findById(id);
  if (!campground) {
    return c.html(
      renderPage(
        html`Campground Not Found`,
        html`<h1>Campground Not Found</h1>
        <p>The campground you are looking for does not exist.</p>
        <a href="/">Back to Home</a>`
      )
    );
  }
  const sitesForCampground = campsites.filter(cs => cs.campgroundId === id);
  return c.html(
    renderPage(
      html`${campground.name}`,
      html`<h1>${campground.name}</h1>
      <h2>Campsites</h2>
      <p><a href="/add-campsite?campground=${id}">Add campsite for ${campground.name}</a></p>
      <ul>
        ${sitesForCampground.map(site => html`<li><a href="/campground/${id}/campsite/${site.id}">${site.name}</a></li>`)}
      </ul>
      <a href="/">Back to Home</a>`
    )
  );
});

app.get('/add-campsite', async (c) => {
  const defaultCampgroundId = parseInt(c.req.query('campground') || '', 10) || undefined;
  const campgrounds = await CampgroundDAO.findAll();
  return c.html(
    renderPage(
      html`Add Campsite`,
      html`<h1>Add New Campsite Report</h1>
      <form method="post" action="/add-campsite">
        <label for="campgroundId">Campground:</label>
        <select id="campgroundId" name="campgroundId" required>
          <option value="">-- Select a campground --</option>
          ${campgrounds.map(camp => html`<option value="${camp.id}"${camp.id === defaultCampgroundId ? ' selected' : ''}>${camp.name}</option>`)}
        </select><br><br>
        
        <label for="name">Site Name:</label>
        <input type="text" id="name" name="name" required><br><br>

        <label for="levelEasiness">Ease to Level Camper (1-3):</label>
        <select id="levelEasiness" name="levelEasiness" required>
          <option value="1">1 - Difficult</option>
          <option value="2">2 - Moderate</option>
          <option value="3">3 - Easy</option>
        </select><br><br>

        <label for="isMuddy">Mud Level (1-3):</label>
        <select id="isMuddy" name="isMuddy" required>
          <option value="1">1 - Very muddy</option>
          <option value="2">2 - Some mud</option>
          <option value="3">3 - No mud</option>
        </select><br><br>
        
        <label for="hasShade">Shade Level (1-3):</label>
        <select id="hasShade" name="hasShade" required>
          <option value="1">1 - Poor</option>
          <option value="2">2 - Moderate</option>
          <option value="3">3 - Good</option>
        </select><br><br>
        
       <label for="tentCapacity">Room for Tents:</label>
        <select id="tentCapacity" name="tentCapacity" required>
          <option value="1">1 small tent</option>
          <option value="2">2 small tents</option>
          <option value="3">3 small tents</option>
        </select><br><br>
        
       <label for="notes">Additional Notes:</label>
        <textarea id="notes" name="notes" rows="4" cols="50"></textarea><br><br>
        
        <button type="submit">Add Campsite Report</button>
      </form>
      <br>
      <a href="/">Back to Home</a>`
    )
  );
});

app.post('/add-campsite', async (c) => {
  const body = await c.req.parseBody();
  const campgroundId = body.campgroundId as string;
  const name = body.name as string;
  const hasShade = parseInt(body.hasShade as string) as 1 | 2 | 3;
  const isMuddy = parseInt(body.isMuddy as string) as 1 | 2 | 3;
  const tentCapacity = parseInt(body.tentCapacity as string) as 1 | 2 | 3;
  const levelEasiness = parseInt(body.levelEasiness as string) as 1 | 2 | 3;
  const notes = body.notes as string;

  if (campgroundId && name && tentCapacity && levelEasiness) {
    campsites.push({
      id: Math.random().toString(36).substr(2, 9),
      campgroundId: parseInt(campgroundId, 10),
      name,
      levelEasiness,
      notes,
      hasShade,
      isMuddy,
      tentCapacity
    });
  }

  return c.html(
    renderPage(
      html`Campsite Added`,
      html`<h1>Campsite Added</h1>
      <p>Your campsite report has been saved.</p>
      <section class="confirm-prompt">
        <p>Add another campsite report for the same campground?</p>
        <div class="confirm-actions">
          <a href="/add-campsite?campground=${campgroundId}" class="button">Yes</a>
          <a href="/campground/${campgroundId}" class="button">No</a>
        </div>
      </section>`
    )
  );
});

app.get('/styles.css', async (c) => {
  const css = await readFile(path.join(__dirname, '../src/styles.css'), 'utf8');
  return c.body(css, 200, { 'Content-Type': 'text/css' });
});

app.get('/campground/:id/campsite/:siteId', async (c) => {
  const campgroundId = parseInt(c.req.param('id'), 10);
  const siteId = c.req.param('siteId');

  const campground = await CampgroundDAO.findById(campgroundId);
  const campsite = campsites.find(cs => cs.id === siteId && cs.campgroundId === campgroundId);

  if (!campground || !campsite) {
    return c.text('Campground or campsite not found', 404);
  }

  const shadeLabel = campsite.hasShade === 1 ? 'Poor' : campsite.hasShade === 2 ? 'Moderate' : 'Good';
  const mudLabel = campsite.isMuddy === 1 ? 'No mud' : campsite.isMuddy === 2 ? 'Some mud' : 'Very muddy';

  return c.html(
    renderPage(
      html`${campsite.name}`,
      html`<h1>${campground.name} - ${campsite.name}</h1>
      <h2>Site Details</h2>
      <p><strong>Ease to Level Camper:</strong> ${campsite.levelEasiness} / 3 (${campsite.levelEasiness === 1 ? 'Difficult' : campsite.levelEasiness === 2 ? 'Moderate' : 'Easy'})</p>
      <p><strong>Mud Level:</strong> ${campsite.isMuddy} / 3 (${mudLabel})</p>
      <p><strong>Shade Level:</strong> ${campsite.hasShade} / 3 (${shadeLabel})</p>
      <p><strong>Room for Tents:</strong> ${campsite.tentCapacity} small tent(s)</p>
      ${campsite.notes ? html`<p><strong>Notes:</strong> ${campsite.notes}</p>` : ''}
      <br>
      <a href="/campground/${campgroundId}">Back to ${campground.name}</a> | 
      <a href="/">Back to Home</a>`
    )
  );
});

const server = serve(app);

// graceful shutdown
process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});