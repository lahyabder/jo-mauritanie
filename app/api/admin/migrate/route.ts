import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// ⚠️  TEMPORARY MIGRATION ENDPOINT — DELETE AFTER USE
// Protected by a secret key to prevent unauthorized access

const MIGRATION_SECRET = process.env.MIGRATION_SECRET ?? 'migrate-jo-2026';

// Build DB URL from Supabase URL if DATABASE_URL not explicitly set
function getDbUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  
  // Derive from Supabase project URL
  // e.g. https://xtwcuuyygocwlkdesvmq.supabase.co → project ref
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return null;
  
  const ref = match[1];
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!pw) return null;
  
  // Use session pooler (port 5432) — works from Vercel edge regions
  return `postgresql://postgres.${ref}:${pw}@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`;
}

export async function POST(req: NextRequest) {
  // Security check
  const auth = req.headers.get('x-migration-secret');
  if (auth !== MIGRATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUrl = getDbUrl();
  if (!dbUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    const client = await pool.connect();

    // Read the migration SQL (passed in body or from filesystem)
    const body = await req.json().catch(() => ({}));
    let sql = body.sql as string | undefined;

    if (!sql) {
      return NextResponse.json({ error: 'Provide sql in body' }, { status: 400 });
    }

    const results: string[] = [];
    const errors: string[] = [];

    // Split SQL into individual statements
    const statements = sql
      .split(/;\s*\n/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 2 && !s.startsWith('--'));

    let executed = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt + ';');
        executed++;
      } catch (err: any) {
        // Log but continue — many statements may fail if already exists
        const msg = `SKIP [${stmt.substring(0, 60).replace(/\n/g, ' ')}...]: ${err.message}`;
        errors.push(msg);
      }
    }

    client.release();
    await pool.end();

    return NextResponse.json({
      success: true,
      total_statements: statements.length,
      executed,
      skipped: errors.length,
      errors: errors.slice(0, 20), // First 20 errors only
    });
  } catch (err: any) {
    await pool.end().catch(() => {});
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
