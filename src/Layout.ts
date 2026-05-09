import { html } from "hono/html";
import { HtmlEscapedString } from "hono/utils/html";

interface SiteData {
  title: string;
  description?: string;
  image?: string;
  children?: HtmlEscapedString | Promise<HtmlEscapedString>;
  scripts?: HtmlEscapedString | Promise<HtmlEscapedString>;
}
const Layout = (props: SiteData) => html`
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${props.title}</title>
  <meta property="og:title" content="${props.title}" />
  ${props.description && `<meta name="description" content="${props.description}" />`}
  ${props.image && `<meta property="og:image" content="${props.image}" />`}
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/campgrounds/add">Add Campground</a>
      <button id="logout-button" type="button">Logout</button>
    </nav>
  </header>
  ${props.children}
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
  ${props.scripts}
</body>
</html>`;

export default Layout;