import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'ADMIN' && session.role !== 'HOD' && session.role !== 'HOI')) {
      return NextResponse.json({ error: 'Unauthorized: Reviewer privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { submissionId, decision, approvedScore, comments = '' } = body;

    if (!submissionId || !decision) {
      return NextResponse.json({ error: 'Submission ID and decision are required.' }, { status: 400 });
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

    // Security Check: Prevent faculty from verifying their own evaluations
    if (submission.user_id === session.id) {
      return NextResponse.json({ error: 'Security Violation: Evaluators cannot verify their own submissions.' }, { status: 403 });
    }

    // Department check for HOD: HOD can only review faculty in their own department
    if (session.role === 'HOD' && session.department_id && submission.faculty_dept_id !== session.department_id) {
      return NextResponse.json({ error: 'Unauthorized: HOD can only review submissions from their department.' }, { status: 403 });
    }

    const previousStatus = submission.status;
    const scoreVal = approvedScore !== undefined && approvedScore !== null
      ? Math.min(Math.max(0, parseFloat(approvedScore)), submission.max_marks)
      : (submission.claimed_score || submission.calculated_score);

    const now = new Date().toISOString();
    let newStatus = previousStatus;
    let updateFields = '';
    const updateParams: any[] = [];

    // 4-Tier Verification Hierarchy
    if (session.role === 'HOD') {
      // Tier 2: HOD Verification
      if (decision === 'APPROVE' || decision === 'VERIFY' || decision === 'APPROVED') {
        newStatus = 'VERIFIED_BY_HOD';
        updateFields = 'status = ?, hod_score = ?, hod_remarks = ?, hod_reviewed_at = ?, hod_reviewer_id = ?, updated_at = ?';
        updateParams.push(newStatus, scoreVal, comments.trim() || 'Verified and recommended by HOD', now, session.id, now);
      } else {
        newStatus = 'REJECTED_BY_HOD';
        updateFields = 'status = ?, hod_remarks = ?, hod_reviewed_at = ?, hod_reviewer_id = ?, updated_at = ?';
        updateParams.push(newStatus, comments.trim() || 'Returned by HOD for revisions', now, session.id, now);
      }
    } else if (session.role === 'HOI') {
      // Tier 3: HOI Verification
      if (decision === 'APPROVE' || decision === 'VERIFY' || decision === 'APPROVED') {
        newStatus = 'VERIFIED_BY_HOI';
        updateFields = 'status = ?, hoi_score = ?, hoi_remarks = ?, hoi_reviewed_at = ?, hoi_reviewer_id = ?, updated_at = ?';
        updateParams.push(newStatus, scoreVal, comments.trim() || 'Verified and forwarded to Director by HOI', now, session.id, now);
      } else {
        newStatus = 'REJECTED_BY_HOI';
        updateFields = 'status = ?, hoi_remarks = ?, hoi_reviewed_at = ?, hoi_reviewer_id = ?, updated_at = ?';
        updateParams.push(newStatus, comments.trim() || 'Returned by HOI for revisions', now, session.id, now);
      }
    } else if (session.role === 'ADMIN') {
      // Tier 4: Director Final Institutional Approval
      if (decision === 'APPROVE' || decision === 'APPROVED') {
        newStatus = 'APPROVED';
        updateFields = 'status = ?, approved_score = ?, director_score = ?, director_remarks = ?, director_reviewed_at = ?, director_reviewer_id = ?, updated_at = ?';
        updateParams.push(newStatus, scoreVal, scoreVal, comments.trim() || 'Final Institutional Approval by Director', now, session.id, now);
      } else {
        newStatus = 'REJECTED';
        updateFields = 'status = ?, director_remarks = ?, director_reviewed_at = ?, director_reviewer_id = ?, updated_at = ?';
        updateParams.push(newStatus, comments.trim() || 'Rejected by Director', now, session.id, now);
      }
    }

    updateParams.push(submissionId);
    db.prepare(`UPDATE faculty_submissions SET ${updateFields} WHERE id = ?`).run(...updateParams);

    // Record review step in reviews audit table
    db.prepare(`
      INSERT INTO reviews (submission_id, reviewer_id, previous_status, new_status, comments, approved_score, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      submissionId,
      session.id,
      previousStatus,
      newStatus,
      comments.trim() || `Processed by ${session.role}`,
      scoreVal,
      now
    );

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      `SUBMISSION_${newStatus}`,
      'FACULTY_SUBMISSION',
      String(submissionId),
      JSON.stringify({
        submissionId,
        categoryName: submission.category_name,
        facultyName: submission.faculty_name,
        reviewerRole: session.role,
        previousStatus,
        newStatus,
        awardedScore: scoreVal,
        comments,
      }),
      now
    );

    return NextResponse.json({
      success: true,
      newStatus,
      awardedScore: scoreVal,
      message: `Evaluation for ${submission.category_name} successfully updated to "${newStatus}"!`,
    });
  } catch (error: any) {
    console.error('Review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
