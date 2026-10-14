import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET() {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT * FROM evaluation_categories ORDER BY role ASC, order_num ASC').all();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { role, code, name, section, description, target_criteria, max_marks, scoring_type } = body;

    if (!role || !code || !name || !max_marks) {
      return NextResponse.json({ error: 'Role, Code, Name, and Max Marks are required.' }, { status: 400 });
    }

    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO evaluation_categories
      (role, code, name, section, description, target_criteria, max_marks, scoring_type, scoring_rules_json, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 99)
    `).run(
      role,
      code.toUpperCase(),
      name,
      section || role,
      description || '',
      target_criteria || '',
      parseInt(max_marks, 10),
      scoring_type || 'CUSTOM',
      JSON.stringify({ cap: parseInt(max_marks, 10) })
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      'CREATE_CATEGORY',
      'CATEGORY',
      String(insert.lastInsertRowid),
      JSON.stringify({ role, code, name, max_marks }),
      new Date().toISOString()
    );

    return NextResponse.json({ success: true, id: insert.lastInsertRowid, message: 'Category created successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, target_criteria, max_marks } = body;

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      UPDATE evaluation_categories
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          target_criteria = COALESCE(?, target_criteria),
          max_marks = COALESCE(?, max_marks)
      WHERE id = ?
    `).run(name, description, target_criteria, max_marks ? parseInt(max_marks, 10) : null, id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      'UPDATE_CATEGORY',
      'CATEGORY',
      String(id),
      JSON.stringify({ id, name, max_marks }),
      new Date().toISOString()
    );

    return NextResponse.json({ success: true, message: 'Category updated successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
