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

## Tech Stack
- Backend: Node.js + TypeScript with Hono
- Database:	PostgreSQL
- SQL Migration: Custom
- Frontend:	HTML/CSS/JS
- Reverse Proxy: Caddy
- Auth: Custom, Argon2id password hashing and verification
- Deployment: Docker Compose

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
- Follow all instructions/guidance in all of the project's README files.
- Any SQL modifications should take place via a SQL script in `sql-migrations`
- Any database read/write should follow the pattern set in `src/db/data-access`
- Refrain from adding new dependencies unless listed in the tech stack

## Philosophy

Keep tech stack simple and mainstream. Avoid dependencies and keep the code base friendly to AI code generation (languages and libraries that AI is well trained on and performs well with).

## Authorization

Customer username/password authorization is implemented in the `./src/auth` directory. See the README in that directory for more information on authorization.

## Database Management

### Database Reads and Writes

Any database read/write method should be defined in an Entity DAO class. This is to ensure that database CRUD logic stays separate from business logic, resulting in easier to maintain database interaction code. See the README in `./src/db` for more information.

### Migrations (DB set up and maintenance)

A custom migration runner will be used as a dependency‑free approach to managing the database schema using plain SQL files. Numbered .sql migration files will be stored inside a db/migrations folder, and a small Node.js script will apply them in order while recording each one in a schema_migrations table. This will provide full visibility into every schema change, ensure the database can be rebuilt from scratch at any time, and keep all setup logic versioned directly in the repository.

Because the migration runner will live entirely in the project’s codebase, it will offer complete control over how migrations are discovered, executed, logged, and validated. This will keep the system easy to understand, easy to maintain, and fully aligned with a minimal tech stack. It will avoid external tooling, maintain predictable behavior, and deliver a Flyway‑style migration history without introducing new dependencies.

The database manager should keep track of what migration files have already run using its own "migrations" table. It should use this to determine which migrations need to be ran, and which ones do not because they have already run, and act accordingly.

See the README in `src/db/migrations` for more information on this implementation.
