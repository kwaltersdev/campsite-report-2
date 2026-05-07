# Database Migrations

This folder contains the SQL migrations and a small custom runner for applying them.

## How `migrate.ts` Works

`migrate.ts` is a dependency-free migration runner that:

1. Ensures the migration history table exists:
   - Creates `schema_migrations` if it does not already exist.
   - The table stores `filename` and `applied_at` so the runner can track which migrations have been applied.

2. Reads already applied migrations:
   - Queries `schema_migrations` for all recorded filenames.
   - Converts the result into a `Set<string>` for quick lookup.

3. Discovers SQL files:
   - Reads the local `migrations` directory.
   - Filters the files to those ending with `.sql`.
   - Sorts them lexicographically so numbered migrations run in order.

4. Applies pending migrations:
   - For each SQL file that is not already recorded in `schema_migrations`:
     - Reads the SQL file contents.
     - Executes the SQL using the shared database `query` helper.
     - Inserts the filename into `schema_migrations` after successful execution.
     - Logs `Applied migration: <filename>`.

5. Completes with a final message:
   - Prints `Migrations complete` when all pending migrations have been applied.

## Important Behavior

- Migrations are only applied once.
- The runner assumes the project root directory contains the `sql-migrations` folder.
- SQL files are executed in sorted order, so naming them with a numeric prefix like `001_...`, `002_...` matters.
- If a migration is already in `schema_migrations`, it is skipped.

## Why this exists

This script implements the project’s custom migration strategy described in the root `README.md`:
- keep schema changes in versioned SQL files
- avoid external tooling
- record migration history in the database
- allow rebuilding the database from scratch reliably

## Usage

Run this script from the `src/db/migrations` context in the app start process or as part of setup.
