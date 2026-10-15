import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'HOI' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: HOI or Admin access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const hoiId = searchParams.get('hoiId') || String(session.id);
    const sessionId = searchParams.get('sessionId') || '1';

    const db = getDb();
    const evaluation = db.prepare(`
      SELECT he.*, u.name as hoi_name
      FROM hoi_evaluations he
      JOIN users u ON he.hoi_id = u.id
      WHERE he.hoi_id = ? AND he.session_id = ?
    `).get(hoiId, sessionId) as any;

    const categories = db.prepare(`
      SELECT * FROM evaluation_categories 
      WHERE role = 'HOI' 
      ORDER BY section DESC, order_num ASC
    `).all() as any[];

    // Department summaries for HOI institutional overview
    const departmentSummaries = db.prepare(`
      SELECT 
        d.id, d.name, d.code, u.name as hod_name,
        COUNT(DISTINCT fac.id) as faculty_count,
        COALESCE(AVG(fs.calculated_score), 0) as avg_score,
        COUNT(CASE WHEN fs.status = 'APPROVED' THEN 1 END) as approved_submissions,
        COUNT(CASE WHEN fs.status = 'SUBMITTED' OR fs.status = 'SUBMITTED_TO_HOD' THEN 1 END) as pending_submissions
      FROM departments d
      LEFT JOIN users u ON d.hod_user_id = u.id
      LEFT JOIN users fac ON d.id = fac.department_id AND fac.role = 'FACULTY'
      LEFT JOIN faculty_submissions fs ON fac.id = fs.user_id AND fs.session_id = ?
      GROUP BY d.id
      ORDER BY d.name ASC
    `).all(sessionId);

    return NextResponse.json({
      success: true,
      evaluation: evaluation || null,
      categories,
      departmentSummaries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'HOI' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: HOI access required.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      instScore,
      selfScore,
      sessionId = 1,
      action = 'SUBMIT', // 'DRAFT' or 'SUBMIT'
    } = body;

    const numInstScore = Math.min(Math.max(0, parseFloat(instScore) || 0), 500); // Max 500
    const numSelfScore = Math.min(Math.max(0, parseFloat(selfScore) || 0), 500); // Max 500
    const totalScore = numInstScore + numSelfScore; // Max 1,000

    const db = getDb();
    const now = new Date().toISOString();
    const status = action === 'DRAFT' ? 'DRAFT' : 'SUBMITTED';

    const existing = db.prepare('SELECT id FROM hoi_evaluations WHERE hoi_id = ? AND session_id = ?').get(session.id, sessionId) as any;

    if (existing) {
      db.prepare(`
        UPDATE hoi_evaluations
        SET inst_score = ?,
            self_score = ?,
            total_score = ?,
            status = ?,
            submitted_at = ?
        WHERE id = ?
      `).run(numInstScore, numSelfScore, totalScore, status, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO hoi_evaluations
        (hoi_id, session_id, inst_score, self_score, total_score, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(session.id, sessionId, numInstScore, numSelfScore, totalScore, status, now);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      'HOI_EVALUATION_SUBMISSION',
      'HOI_EVALUATION',
      String(session.id),
      JSON.stringify({ instScore: numInstScore, selfScore: numSelfScore, totalScore, status }),
      now
    );

    return NextResponse.json({
      success: true,
      message: action === 'DRAFT' ? 'HOI draft saved successfully.' : 'HOI evaluation (1,000 Marks) submitted to Institutional Authority for review!',
      instScore: numInstScore,
      selfScore: numSelfScore,
      totalScore,
      status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
