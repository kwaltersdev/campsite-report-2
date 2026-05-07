# Campsite Report
Only logged in users can access the site.

This application lets users capture campgrounds and campsite reports with practical details for choosing a site.

Users can add campgrounds, then add campsite reports tied to a campground with:
- site name
- shade rating (1–3)
- mud rating (1–3)
- tent capacity
- camper leveling ease (1–3)
- optional notes

After submitting a report, users can choose to add another report for the same campground or return to the campground details.

## Authorization

To start, only one user (username: admin) will be able to login. The very first time a user visits the site they will be asked to provide an answer to the question "Who are you?" to which they must respond "Curious George". If they answer the question correctly, they will be asked to choose a password, and then retype to verify the password.

From that point on, any user that visits any page will be redirected to the login page if they are not logged in, where they must enter a username and password.

## Database Management

A custom migration runner will be used as a dependency‑free approach to managing the database schema using plain SQL files. Numbered .sql migration files will be stored inside a db/migrations folder, and a small Node.js script will apply them in order while recording each one in a schema_migrations table. This will provide full visibility into every schema change, ensure the database can be rebuilt from scratch at any time, and keep all setup logic versioned directly in the repository.

Because the migration runner will live entirely in the project’s codebase, it will offer complete control over how migrations are discovered, executed, logged, and validated. This will keep the system easy to understand, easy to maintain, and fully aligned with a minimal tech stack. It will avoid external tooling, maintain predictable behavior, and deliver a Flyway‑style migration history without introducing new dependencies.

The database manager should keep track of what migration files have already run using its own "migrations" table. It should use this to determine which migrations need to be ran, and which ones do not because they have already run, and act accordingly.

## Tech Stack
- Backend: Node.js + TypeScript with Hono
- Database:	PostgreSQL
- SQL Migration: Custom
- Frontend:	HTML/CSS/JS
- Reverse Proxy:	Caddy
- Auth: Custom, Node.js crypto password hashing and verification
- Deployment:	Docker Compose

## Development
- Development environment uses Docker Compose to connect to a PostgreSQL Database

### Local Development with Docker
1. Ensure Docker is installed and running.
2. From the project root, start the app with:
   ```bash
   docker compose up --build
   ```
3. Open the app at `http://localhost:3000`.
4. PostgreSQL is available at `localhost:5432` with:
   - user: `postgres`
   - password: `postgres`
   - database: `campsite_report_dev`

To stop the development environment:
```bash
docker compose down
```

## Coding Guidelines for Copilot

Copilot should:
- Any SQL modifications should take place via a SQL script
- Refrain from adding new dependencies unless listed in the tech stack

## Philosophy

Keep tech stack simple and mainstream. Avoid dependencies and keep the code base friendly to AI code generation (languages and libraries that AI is well trained on and performs well with).
