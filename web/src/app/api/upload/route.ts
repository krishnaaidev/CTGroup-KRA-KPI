import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const submissionId = formData.get('submissionId') ? parseInt(formData.get('submissionId') as string, 10) : null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${Date.now()}_${sanitizedName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFileName}`;
    const now = new Date().toISOString();

    const db = getDb();
    const insertDoc = db.prepare(`
      INSERT INTO supporting_documents (submission_id, user_id, file_name, file_url, file_size, mime_type, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(submissionId, session.id, file.name, fileUrl, file.size, file.type, now);

    return NextResponse.json({
      success: true,
      documentId: insertDoc.lastInsertRowid,
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
