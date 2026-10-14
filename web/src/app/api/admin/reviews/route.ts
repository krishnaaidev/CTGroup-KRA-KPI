import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'ADMIN' && session.role !== 'HOD' && session.role !== 'HOI')) {
      return NextResponse.json({ error: 'Unauthorized: Reviewer privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { submissionId, decision, approvedScore, comments = '' } = body;

    if (!submissionId || !decision) {
      return NextResponse.json({ error: 'Submission ID and decision (APPROVED / REJECTED) are required.' }, { status: 400 });
    }

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ error: 'Decision must be APPROVED or REJECTED.' }, { status: 400 });
    }

    const db = getDb();
    const submission = db.prepare(`
      SELECT fs.*, ec.max_marks, ec.name as category_name, u.name as faculty_name, u.department_id as faculty_dept_id
      FROM faculty_submissions fs
      JOIN evaluation_categories ec ON fs.category_id = ec.id
      JOIN users u ON fs.user_id = u.id
      WHERE fs.id = ?
    `).get(submissionId) as any;

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    // Security Check (PRD Section 8):
    // "Prevent faculty from approving their own evaluations"
    if (submission.user_id === session.id) {
      return NextResponse.json({ error: 'Security Violation: Evaluators cannot approve their own submissions.' }, { status: 403 });
    }

    // HOD check: HOD can only review faculty in their own department
    if (session.role === 'HOD' && submission.faculty_dept_id !== session.department_id) {
      return NextResponse.json({ error: 'Unauthorized: HOD can only review submissions from their department.' }, { status: 403 });
    }

    const previousStatus = submission.status;
    let finalApprovedScore = 0;

    if (decision === 'APPROVED') {
      finalApprovedScore = approvedScore !== undefined && approvedScore !== null
        ? Math.min(Math.max(0, parseFloat(approvedScore)), submission.max_marks)
        : submission.calculated_score;
    } else {
      finalApprovedScore = 0;
    }

    const now = new Date().toISOString();

    // Update submission
    db.prepare(`
      UPDATE faculty_submissions
      SET status = ?,
          approved_score = ?,
          updated_at = ?
      WHERE id = ?
    `).run(decision, decision === 'APPROVED' ? finalApprovedScore : null, now, submissionId);

    // Insert Review Record
    db.prepare(`
      INSERT INTO reviews (submission_id, reviewer_id, previous_status, new_status, comments, approved_score, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      submissionId,
      session.id,
      previousStatus,
      decision,
      comments.trim() || (decision === 'APPROVED' ? 'Approved by reviewer.' : 'Evidence insufficient. Needs revision.'),
      finalApprovedScore,
      now
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      decision === 'APPROVED' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
      'FACULTY_SUBMISSION',
      String(submissionId),
      JSON.stringify({
        submissionId,
        categoryName: submission.category_name,
        facultyName: submission.faculty_name,
        previousStatus,
        newStatus: decision,
        approvedScore: finalApprovedScore,
        comments,
      }),
      now
    );

    return NextResponse.json({
      success: true,
      decision,
      approvedScore: finalApprovedScore,
      message: `Submission for ${submission.category_name} successfully ${decision.toLowerCase()}!`,
    });
  } catch (error: any) {
    console.error('Review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
