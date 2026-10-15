import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { saveGoogleDbConfig, getGoogleDbConfig, getGoogleDbStatus } from '@/lib/googleDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const config = getGoogleDbConfig();
    return NextResponse.json({
      success: true,
      config: {
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        isConfigured: config.isConfigured,
        hasPrivateKey: Boolean(config.privateKey),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, clientEmail, privateKey } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Google Cloud Project ID is required.' }, { status: 400 });
    }

    saveGoogleDbConfig({
      projectId: projectId.trim(),
      clientEmail: (clientEmail || '').trim(),
      privateKey: (privateKey || '').trim(),
    });

    const status = await getGoogleDbStatus();

    return NextResponse.json({
      success: true,
      message: `Google Cloud Database settings updated for project "${projectId}".`,
      status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
