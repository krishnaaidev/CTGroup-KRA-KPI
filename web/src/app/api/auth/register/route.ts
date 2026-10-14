import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, college_id, email, phone, department_id, designation, password } = body;

    // Validation
    if (!name || !college_id || !email || !password || !designation) {
      return NextResponse.json({ error: 'Please provide all required fields (Name, College ID, Email, Password, Designation).' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const db = getDb();

    // Check duplicate email or college_id
    const existing = db.prepare('SELECT id, email, college_id FROM users WHERE email = ? OR college_id = ?').get(email.toLowerCase().trim(), college_id.trim()) as any;
    if (existing) {
      if (existing.email === email.toLowerCase().trim()) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      if (existing.college_id === college_id.trim()) {
        return NextResponse.json({ error: 'A user with this College/Employee ID already exists.' }, { status: 409 });
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const insertResult = db.prepare(`
      INSERT INTO users (name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'FACULTY', ?, ?, 'PENDING_APPROVAL', ?, ?)
    `).run(
      name.trim(),
      college_id.trim(),
      email.toLowerCase().trim(),
      phone || '',
      passwordHash,
      department_id ? parseInt(department_id, 10) : null,
      designation.trim(),
      now,
      now
    );

    const newUserId = insertResult.lastInsertRowid;

    // Audit log
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newUserId,
      'FACULTY_REGISTRATION',
      'USER',
      String(newUserId),
      JSON.stringify({ name, email, college_id, department_id, designation }),
      clientIp,
      now
    );

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully! Your account is currently pending Admin approval.',
      userId: newUserId,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Server error during registration: ' + error.message }, { status: 500 });
  }
}
