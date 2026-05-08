import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/campsite_report_dev';
export const pool = new Pool({ connectionString: databaseUrl });

export async function query(text: string, params?: Array<unknown>) {
  return pool.query(text, params);
}
