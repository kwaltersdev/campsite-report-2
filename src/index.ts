import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { html } from 'hono/html';
import { HtmlEscapedString } from 'hono/utils/html';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const app = new Hono();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sharedHeader = html`
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/add-campground">Add Campground</a>
      <a href="/add-campsite">Add Campsite</a>
    </nav>
  </header>
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

interface Campground {
  id: number;
  name: string;
}

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
  const result = await query('SELECT id, name FROM campgrounds ORDER BY name');
  const campgrounds = result.rows as Campground[];
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
    await query('INSERT INTO campgrounds (name) VALUES ($1)', [name]);
  }
  return c.redirect('/');
});

app.get('/campground/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const result = await query('SELECT id, name FROM campgrounds WHERE id = $1', [id]);
  const campground = result.rows[0] as Campground | undefined;
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
  const result = await query('SELECT id, name FROM campgrounds ORDER BY name');
  const campgrounds = result.rows as { id: number; name: string; }[];
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
  const campgroundId = parseInt(body.campgroundId as string, 10);
  const name = body.name as string;
  const hasShade = parseInt(body.hasShade as string) as 1 | 2 | 3;
  const isMuddy = parseInt(body.isMuddy as string) as 1 | 2 | 3;
  const tentCapacity = parseInt(body.tentCapacity as string) as 1 | 2 | 3;
  const levelEasiness = parseInt(body.levelEasiness as string) as 1 | 2 | 3;
  const notes = body.notes as string;

  if (campgroundId && name && tentCapacity && levelEasiness) {
    campsites.push({
      id: Math.random().toString(36).substr(2, 9),
      campgroundId,
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

  const campgroundResult = await query('SELECT id, name FROM campgrounds WHERE id = $1', [campgroundId]);
  const campground = campgroundResult.rows[0] as Campground | undefined;
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