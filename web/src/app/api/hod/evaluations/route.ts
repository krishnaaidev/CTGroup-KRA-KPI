import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'HOD' && session.role !== 'ADMIN' && session.role !== 'HOI')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const hodId = searchParams.get('hodId') || String(session.id);
    const sessionId = searchParams.get('sessionId') || '1';

    const db = getDb();
    const evaluation = db.prepare(`
      SELECT he.*, d.name as department_name, u.name as hod_name
      FROM hod_evaluations he
      JOIN departments d ON he.department_id = d.id
      JOIN users u ON he.hod_id = u.id
      WHERE he.hod_id = ? AND he.session_id = ?
    `).get(hodId, sessionId) as any;

    // Fetch HOD categories (DEPT = 400 marks, SELF = 600 marks)
    const categories = db.prepare(`
      SELECT * FROM evaluation_categories 
      WHERE role = 'HOD' 
      ORDER BY section DESC, order_num ASC
    `).all() as any[];

    // Fetch department faculty stats for HOD overview
    let facultyStats = { totalFaculty: 0, pendingFacultySubmissions: 0, avgFacultyScore: 0 };
    if (session.department_id) {
      const stats = db.prepare(`
        SELECT 
          COUNT(DISTINCT u.id) as total_faculty,
          COUNT(CASE WHEN fs.status = 'SUBMITTED' OR fs.status = 'SUBMITTED_TO_HOD' THEN 1 END) as pending_submissions,
          AVG(fs.calculated_score) as avg_score
        FROM users u
        LEFT JOIN faculty_submissions fs ON u.id = fs.user_id AND fs.session_id = ?
        WHERE u.department_id = ? AND u.role = 'FACULTY'
      `).get(sessionId, session.department_id) as any;

      if (stats) {
        facultyStats = {
          totalFaculty: stats.total_faculty || 0,
          pendingFacultySubmissions: stats.pending_submissions || 0,
          avgFacultyScore: Math.round((stats.avg_score || 0) * 10) / 10,
        };
      }
    }

    return NextResponse.json({
      success: true,
      evaluation: evaluation || null,
      categories,
      facultyStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'HOD' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: HOD access required.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      deptScore,
      selfScore,
      departmentId = session.department_id,
      sessionId = 1,
      action = 'SUBMIT', // 'DRAFT' or 'SUBMIT'
    } = body;

    const numDeptScore = Math.min(Math.max(0, parseFloat(deptScore) || 0), 400); // Max 400
    const numSelfScore = Math.min(Math.max(0, parseFloat(selfScore) || 0), 600); // Max 600
    const totalScore = numDeptScore + numSelfScore; // Max 1,000

    const db = getDb();
    const now = new Date().toISOString();
    const status = action === 'DRAFT' ? 'DRAFT' : 'SUBMITTED';

    const existing = db.prepare('SELECT id FROM hod_evaluations WHERE hod_id = ? AND session_id = ?').get(session.id, sessionId) as any;

    if (existing) {
      db.prepare(`
        UPDATE hod_evaluations
        SET dept_score = ?,
            self_score = ?,
            total_score = ?,
            status = ?,
            submitted_at = ?
        WHERE id = ?
      `).run(numDeptScore, numSelfScore, totalScore, status, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO hod_evaluations
        (hod_id, department_id, session_id, dept_score, self_score, total_score, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(session.id, departmentId || 1, sessionId, numDeptScore, numSelfScore, totalScore, status, now);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      'HOD_EVALUATION_SUBMISSION',
      'HOD_EVALUATION',
      String(session.id),
      JSON.stringify({ deptScore: numDeptScore, selfScore: numSelfScore, totalScore, status }),
      now
    );

    return NextResponse.json({
      success: true,
      message: action === 'DRAFT' ? 'HOD draft saved successfully.' : 'HOD evaluation (1,000 Marks) submitted for institutional review!',
      deptScore: numDeptScore,
      selfScore: numSelfScore,
      totalScore,
      status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
