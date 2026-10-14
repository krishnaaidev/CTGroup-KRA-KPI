import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const userId = parseInt(params.id, 10);
    const body = await req.json();
    const { status, role, department_id } = body;

    if (!['APPROVED', 'REJECTED', 'PENDING_APPROVAL'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const now = new Date().toISOString();
    let updateQuery = 'UPDATE users SET status = ?, updated_at = ?';
    const queryParams: any[] = [status, now];

    if (role) {
      updateQuery += ', role = ?';
      queryParams.push(role);
    }
    if (department_id !== undefined) {
      updateQuery += ', department_id = ?';
      queryParams.push(department_id ? parseInt(department_id, 10) : null);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(userId);

    db.prepare(updateQuery).run(...queryParams);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      status === 'APPROVED' ? 'USER_REGISTRATION_APPROVED' : 'USER_REGISTRATION_REJECTED',
      'USER',
      String(userId),
      JSON.stringify({
        targetUserId: userId,
        targetEmail: user.email,
        previousStatus: user.status,
        newStatus: status,
      }),
      now
    );

    return NextResponse.json({
      success: true,
      message: `User ${user.name} has been ${status.toLowerCase()}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
