import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getGoogleDbStatus, syncAllToGoogleDb } from '@/lib/googleDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'ADMIN' && session.role !== 'HOI')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or HOI privileges required.' }, { status: 403 });
    }

    const status = await getGoogleDbStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required to trigger Google DB sync.' }, { status: 403 });
    }

    const result = await syncAllToGoogleDb();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
