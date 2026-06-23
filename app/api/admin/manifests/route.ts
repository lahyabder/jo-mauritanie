import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MANIFESTS_DIR = path.join(process.cwd(), 'manifests');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    // Create directory if it doesn't exist
    if (!fs.existsSync(MANIFESTS_DIR)) {
      fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
    }

    // 1. Fetch a specific manifest's full content
    if (filename) {
      const filePath = path.join(MANIFESTS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
      }
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(rawData);
      return NextResponse.json({ filename, content: data });
    }

    // 2. Otherwise list all manifests
    const files = fs.readdirSync(MANIFESTS_DIR);
    const manifests = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const filePath = path.join(MANIFESTS_DIR, file);
        const stats = fs.statSync(filePath);
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(rawData);
        
        return {
          filename: file,
          issueNumber: data.issue?.issue_number || 'unknown',
          publishedDate: data.issue?.published_date || 'unknown',
          qcPassed: data.quality_control?.passed || false,
          dryRun: data.pipeline?.dry_run ?? true,
          totalDocs: data.extraction?.documents || 0,
          totalArticles: data.extraction?.articles || 0,
          totalPersons: data.extraction?.persons || 0,
          totalInstitutions: data.extraction?.institutions || 0,
          startedAt: data.pipeline?.started_at,
          mtime: stats.mtime
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return NextResponse.json(manifests);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, content } = body;

    if (!filename || !content) {
      return NextResponse.json({ error: 'Missing filename or content' }, { status: 400 });
    }

    const filePath = path.join(MANIFESTS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Manifest file does not exist' }, { status: 404 });
    }

    // Overwrite the JSON file with corrected data
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
    return NextResponse.json({ success: true, message: 'Manifest saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
