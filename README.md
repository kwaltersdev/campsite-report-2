# Campsite Report
This application lets users capture campgrounds and campsite reports with practical details for choosing a site.

Users can add campgrounds, then add campsite reports tied to a campground with:
- site name
- shade rating (1–3)
- mud rating (1–3)
- tent capacity
- camper leveling ease (1–3)
- optional notes

After submitting a report, users can choose to add another report for the same campground or return to the campground details.

## Tech Stack
Backend: Node.js + TypeScript with Hono
Database:	PostgreSQL
Frontend:	HTML/CSS/JS
Reverse Proxy:	Caddy
Auth: Lucia
Deployment:	Docker Compose

## Coding Guidelines for Copilot

Copilot should:
- Refrain from adding new dependencies unless listed in the tech stack