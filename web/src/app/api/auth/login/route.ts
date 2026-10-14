import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { getUserByEmailOrCollegeId, signToken, AUTH_COOKIE_OPTIONS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Please enter your College ID / Email and password.' }, { status: 400 });
    }

    const trimmedIdentifier = identifier.trim();
    const user = getUserByEmailOrCollegeId(trimmedIdentifier);

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials or user not found.' }, { status: 401 });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid password. Please check and try again.' }, { status: 401 });
    }

    // Check account status
    if (user.status === 'PENDING_APPROVAL') {
      return NextResponse.json({
        error: 'Your registration is pending Administrator approval. Please contact the IT Director (developer@ctgroup.in).',
        isPending: true,
      }, { status: 403 });
    }

    if (user.status === 'REJECTED') {
      return NextResponse.json({
        error: 'Your account registration was rejected by the Administrator. Please contact academic HR.',
        isRejected: true,
      }, { status: 403 });
    }

    // Generate JWT token
    const token = signToken({
      id: user.id,
      college_id: user.college_id,
      email: user.email,
      name: user.name,
      role: user.role,
      department_id: user.department_id,
    });

    // Record audit log
    const db = getDb();
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      'USER_LOGIN',
      'USER',
      String(user.id),
      JSON.stringify({ email: user.email, role: user.role }),
      clientIp,
      new Date().toISOString()
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      college_id: user.college_id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department_id: user.department_id,
      department_name: user.department_name,
      designation: user.designation,
      status: user.status,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      token,
      message: 'Login successful',
    });

    // Set cookie
    response.cookies.set(AUTH_COOKIE_OPTIONS.name, token, AUTH_COOKIE_OPTIONS);

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error during authentication: ' + error.message }, { status: 500 });
  }
}
