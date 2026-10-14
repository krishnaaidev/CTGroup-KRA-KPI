import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'ADMIN' && session.role !== 'HOI')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or HOI access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');

    const db = getDb();
    let query = `
      SELECT u.id, u.name, u.college_id, u.email, u.phone, u.role, u.department_id, 
             u.designation, u.status, u.created_at, u.updated_at,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.college_id LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (status) {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    if (departmentId) {
      query += ` AND u.department_id = ?`;
      params.push(parseInt(departmentId, 10));
    }

    query += ` ORDER BY u.created_at DESC`;

    const users = db.prepare(query).all(...params);

    // Compute stats
    const stats = {
      totalUsers: db.prepare('SELECT count(*) as c FROM users').get() as { c: number },
      pendingRegistrations: db.prepare("SELECT count(*) as c FROM users WHERE status = 'PENDING_APPROVAL'").get() as { c: number },
      facultyCount: db.prepare("SELECT count(*) as c FROM users WHERE role = 'FACULTY' AND status = 'APPROVED'").get() as { c: number },
      hodCount: db.prepare("SELECT count(*) as c FROM users WHERE role = 'HOD'").get() as { c: number },
      hoiCount: db.prepare("SELECT count(*) as c FROM users WHERE role = 'HOI'").get() as { c: number },
    };

    return NextResponse.json({
      success: true,
      users,
      stats: {
        total: stats.totalUsers.c,
        pending: stats.pendingRegistrations.c,
        faculty: stats.facultyCount.c,
        hod: stats.hodCount.c,
        hoi: stats.hoiCount.c,
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
      return NextResponse.json({ error: 'Unauthorized: Only Administrators can create accounts directly.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, college_id, email, phone, role, department_id, designation, password } = body;

    if (!name || !college_id || !email || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields (Name, College ID, Email, Role, Password).' }, { status: 400 });
    }

    const db = getDb();

    // Check duplicate
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR college_id = ?').get(email.toLowerCase().trim(), college_id.trim());
    if (existing) {
      return NextResponse.json({ error: 'User with this email or College ID already exists.' }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO users (name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?)
    `).run(
      name.trim(),
      college_id.trim(),
      email.toLowerCase().trim(),
      phone || '',
      passwordHash,
      role,
      department_id ? parseInt(department_id, 10) : null,
      designation || role,
      now,
      now
    );

    const newUserId = insert.lastInsertRowid;

    // If role is HOD and department provided, assign HOD to department
    if (role === 'HOD' && department_id) {
      db.prepare('UPDATE departments SET hod_user_id = ? WHERE id = ?').run(newUserId, parseInt(department_id, 10));
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      'ADMIN_CREATE_USER',
      'USER',
      String(newUserId),
      JSON.stringify({ name, email, role, college_id, department_id }),
      now
    );

    return NextResponse.json({
      success: true,
      message: `${role} account created successfully!`,
      userId: newUserId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
