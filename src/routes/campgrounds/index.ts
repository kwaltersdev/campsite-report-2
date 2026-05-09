import { Hono } from "hono";
import { html } from "hono/html";
import { CampgroundDAO } from "../../db/data-access/campgrounds/Campground";
import campsitesApp from "./campsites";
import Layout from "../../Layout";
import { campsites } from "..";

const campgroundsApp = new Hono();
campgroundsApp.route('/:campgroundId/campsites', campsitesApp);

campgroundsApp.get('/add', (c) =>
  c.html(
    Layout({
      title: `Add Campground`,
      children: html`
        <h1>Add New Campground</h1>
        <form method="post" action="/campgrounds/add">
          <label for="name">Name:</label>
          <input type="text" id="name" name="name" required><br><br>
          <button type="submit">Add Campground</button>
        </form>
        <br>
        <a href="/">Back to Home</a>`
    })
  )
);

campgroundsApp.post('/add', async (c) => {
  const body = await c.req.parseBody();
  const name = body.name as string;
  if (name) {
    await CampgroundDAO.create(name);
  }
  return c.redirect('/');
});

campgroundsApp.get('/:campgroundId', async (c) => {
  const id = parseInt(c.req.param('campgroundId'), 10);
  const campground = await CampgroundDAO.findById(id);
  if (!campground) {
    return c.html(
      Layout({
        title: 'Campground Not Found',
        children: html`
          <h1>Campground Not Found</h1>
          <p>The campground you are looking for does not exist.</p>
          <a href="/">Back to Home</a>`
      })
    );
  }

  const sitesForCampground = campsites.filter(cs => cs.campgroundId === id);
  return c.html(
    Layout({
      title: campground.name,
      children: html`
        <h1>${campground.name}</h1>
        <h2>Campsites</h2>
        <p><a href="/campgrounds/${id}/campsites/add">Add campsite for ${campground.name}</a></p>
        <ul>
          ${sitesForCampground.map(site => html`<li><a href="/campgrounds/${id}/campsites/${site.id}">${site.name}</a></li>`)}
        </ul>
        <a href="/">Back to Home</a>`
    })
  );
});

export default campgroundsApp;