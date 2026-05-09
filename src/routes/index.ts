import { Hono } from "hono";
import { html } from "hono/html";
import { CampgroundDAO } from "../db/data-access/campgrounds/Campground";
import Layout from "../Layout";
import authApp from "./auth";
import campgroundsApp from "./campgrounds";

const baseApp = new Hono<{ Variables: { userId: string | null; }; }>();

baseApp.route('/auth', authApp);
baseApp.route('/campgrounds', campgroundsApp);

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

export const campsites: Campsite[] = [];

baseApp.get('/', async (c) => {
  const campgrounds = await CampgroundDAO.findAll();
  return c.html(Layout({
    title: 'Campsite Report',
    children: html`
      <h1>Campsite Report</h1>
      <p>Welcome to the Campsite Report app!</p>
      <h2>Campgrounds</h2>
      <ul>
        ${campgrounds.map(camp => html`<li><a href="/campgrounds/${camp.id}">${camp.name}</a></li>`)}
      </ul>`
  }));
});

baseApp.get('/login', (c) =>
  c.html(
    Layout({
      title: 'Login',
      children: html`
        <h1>Login</h1>
        <form id="login-form">
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" required><br><br>

          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required><br><br>

          <button type="submit">Sign In</button>
        </form>
        <p id="login-error" style="color: red; display: none;"></p>`,
      scripts: html`
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
        </script>
      `
    })
  )
);

baseApp.get('/reset-password', (c) => {
  const userId = c.get('userId') as string | null;
  if (!userId) {
    return c.redirect('/login');
  }

  return c.html(
    Layout({
      title: 'Reset Password',
      children: html`
        <h1>Reset Password</h1>
        <form id="reset-password-form">
          <label for="newPassword">New Password:</label>
          <input type="password" id="newPassword" name="newPassword" required><br><br>

          <label for="confirmPassword">Confirm Password:</label>
          <input type="password" id="confirmPassword" name="confirmPassword" required><br><br>

          <button type="submit">Save Password</button>
        </form>
        <p id="reset-error" style="color: red; display: none;"></p>`,
      scripts: html`
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
    })
  );
});

export default baseApp;