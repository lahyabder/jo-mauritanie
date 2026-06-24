import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// ⚠️  TEMPORARY MIGRATION ENDPOINT — DELETE AFTER USE
// Protected by a secret key to prevent unauthorized access

const MIGRATION_SECRET = process.env.MIGRATION_SECRET ?? 'migrate-jo-2026';

// Known Supabase pooler regions
const REGIONS = [
  'eu-west-3', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'eu-north-1',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-southeast-1', 'ap-northeast-1', 'ap-south-1',
  'ca-central-1', 'sa-east-1',
];

async function tryConnect(url: string): Promise<boolean> {
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    return true;
  } catch {
    await pool.end().catch(() => {});
    return false;
  }
}

async function findWorkingDbUrl(ref: string, pw: string): Promise<string | null> {
  const encodedPw = encodeURIComponent(pw);
  
  // Try direct DB host first (no pooler)
  const directUrl = `postgresql://postgres:${encodedPw}@db.${ref}.supabase.co:5432/postgres`;
  if (await tryConnect(directUrl)) { console.log('direct'); return directUrl; }
  
  for (const region of REGIONS) {
    const base = `aws-0-${region}.pooler.supabase.com`;
    // Transaction pooler (port 6543) — no prepared statements
    const url6543 = `postgresql://postgres.${ref}:${encodedPw}@${base}:6543/postgres`;
    if (await tryConnect(url6543)) { console.log(`Found: ${region}:6543`); return url6543; }
    // Session pooler (port 5432)
    const url5432 = `postgresql://postgres.${ref}:${encodedPw}@${base}:5432/postgres`;
    if (await tryConnect(url5432)) { console.log(`Found: ${region}:5432`); return url5432; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  // Security check
  const auth = req.headers.get('x-migration-secret');
  if (auth !== MIGRATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sql = body.sql as string | undefined;
  const testOnly = body.test_only as boolean | undefined;

  // Build connection URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const ref = match?.[1];
  const pw = process.env.SUPABASE_DB_PASSWORD;

  if (!ref || !pw) {
    return NextResponse.json({ error: 'Missing SUPABASE env vars', ref, hasPw: !!pw }, { status: 500 });
  }

  // Find working region
  const dbUrl = await findWorkingDbUrl(ref, pw);
  if (!dbUrl) {
    return NextResponse.json({ error: 'Cannot connect to DB — no region reachable or wrong password' }, { status: 500 });
  }

  if (testOnly) {
    return NextResponse.json({ success: true, message: 'DB connection OK', dbUrl: dbUrl.replace(pw, '****') });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Provide sql in body' }, { status: 400 });
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    const client = await pool.connect();
    const errors: string[] = [];

    // Split SQL into individual statements — split on semicolon at end of line
    const statements = sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 3 && !s.startsWith('--'));

    let executed = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        executed++;
      } catch (err: any) {
        errors.push(`[${stmt.substring(0, 50).replace(/\n/g, ' ')}]: ${err.message}`);
      }
    }

    client.release();
    await pool.end();

    return NextResponse.json({
      success: true,
      total_statements: statements.length,
      executed,
      skipped: errors.length,
      errors: errors.slice(0, 30),
    });
  } catch (err: any) {
    await pool.end().catch(() => {});
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
