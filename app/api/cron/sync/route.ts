import { NextRequest, NextResponse } from 'next/server';
import { runAutoSync } from '@/lib/sync/crawler';

// This endpoint can be hit by Vercel Cron (configured in vercel.json)
// or manually invoked by an administrator.
export async function GET(req: NextRequest) {
  try {
    // Basic security: require a secret token to trigger sync
    const authHeader = req.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
    
    // In dev, we might allow it without token, but in prod we require it
    if (process.env.NODE_ENV === 'production' && authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine trigger type
    const isManual = req.nextUrl.searchParams.get('manual') === 'true';
    const triggerType = isManual ? 'manual' : 'cron';
    const userId = req.nextUrl.searchParams.get('userId') || undefined;

    // Fire and forget: We don't want the Vercel serverless function to timeout (usually 10s-60s max)
    // while the crawler is downloading potentially massive PDFs.
    runAutoSync(triggerType, userId).catch(err => {
      console.error("Auto-sync background task failed:", err);
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Synchronization job triggered successfully in the background.' 
    });

  } catch (error: any) {
    console.error('Cron sync handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
