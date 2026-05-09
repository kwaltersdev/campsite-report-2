import { Hono } from "hono";
import { html } from "hono/html";
import { CampgroundDAO } from "../../../db/data-access/campgrounds/Campground";
import Layout from "../../../Layout";
import { campsites } from "../..";

const campsitesApp = new Hono();

// /campgrounds/:campgroundId/campsites/add
campsitesApp.get('/add', async (c) => {
  const campgroundId = c.req.param('campgroundId');
  return c.html(
    Layout({
      title: 'Add Campsite',
      children: html`
        <h1>Add New Campsite Report</h1>
        <form method="post" action="/campgrounds/${campgroundId}/campsites/add">
          <label for="campgroundId">Campground:</label>

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
    })
  );
});

// /campgrounds/:campgroundId/campsites/add
campsitesApp.post('/add', async (c) => {
  const campgroundId = c.req.param('campgroundId');
  const body = await c.req.parseBody();
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
    Layout({
      title: 'Campsite Added',
      children: html`
        <h1>Campsite Added</h1>
        <p>Your campsite report has been saved.</p>
        <section class="confirm-prompt">
          <p>Add another campsite report for the same campground?</p>
        <div class="confirm-actions">
          <a href="/campgrounds/${campgroundId}/campsites/add" class="button">Yes</a>
          <a href="/campgrounds/${campgroundId}" class="button">No</a>
        </div>
      </section>`
    })
  );
});

// /campgrounds/:campgroundId/campsites/:siteId
campsitesApp.get('/:siteId', async (c) => {
  const campgroundId = parseInt(c.req.param('campgroundId') ?? '', 10);
  const siteId = c.req.param('siteId');

  const campground = await CampgroundDAO.findById(campgroundId);
  const campsite = campsites.find(cs => cs.id === siteId && cs.campgroundId === campgroundId);

  if (!campground || !campsite) {
    return c.text('Campground or campsite not found', 404);
  }

  const shadeLabel = campsite.hasShade === 1 ? 'Poor' : campsite.hasShade === 2 ? 'Moderate' : 'Good';
  const mudLabel = campsite.isMuddy === 1 ? 'No mud' : campsite.isMuddy === 2 ? 'Some mud' : 'Very muddy';

  return c.html(
    Layout({
      title: campsite.name,
      children: html`
        <h1>${campground.name} - ${campsite.name}</h1>
        <h2>Site Details</h2>
        <p><strong>Ease to Level Camper:</strong> ${campsite.levelEasiness} / 3 (${campsite.levelEasiness === 1 ? 'Difficult' : campsite.levelEasiness === 2 ? 'Moderate' : 'Easy'})</p>
        <p><strong>Mud Level:</strong> ${campsite.isMuddy} / 3 (${mudLabel})</p>
        <p><strong>Shade Level:</strong> ${campsite.hasShade} / 3 (${shadeLabel})</p>
      <p><strong>Room for Tents:</strong> ${campsite.tentCapacity} small tent(s)</p>
      ${campsite.notes ? html`<p><strong>Notes:</strong> ${campsite.notes}</p>` : ''}
      <br>
      <a href="/campgrounds/${campgroundId}">Back to ${campground.name}</a> | 
      <a href="/">Back to Home</a>`
    })
  );
});

export default campsitesApp;