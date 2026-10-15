import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const departments = db.prepare(`
      SELECT d.*, u.name as hod_name 
      FROM departments d 
      LEFT JOIN users u ON d.hod_user_id = u.id 
      ORDER BY d.name ASC
    `).all();

    const activeSession = db.prepare('SELECT * FROM academic_sessions WHERE is_active = 1 LIMIT 1').get();

    return NextResponse.json({
      success: true,
      departments,
      activeSession,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
