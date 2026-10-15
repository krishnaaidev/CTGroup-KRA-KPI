import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest, getUserById } from '@/lib/auth';
import { computeFacultyScore } from '@/lib/scoringEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');
    const departmentId = searchParams.get('departmentId');
    const statusFilter = searchParams.get('status');
    const sessionId = searchParams.get('sessionId') || '1';

    let targetUserId = session.id;

    // RBAC check: only ADMIN, HOI, or HOD of department can view other users' submissions
    if (requestedUserId) {
      const parsedReqUserId = parseInt(requestedUserId, 10);
      if (session.role === 'ADMIN' || session.role === 'HOI') {
        targetUserId = parsedReqUserId;
      } else if (session.role === 'HOD') {
        const targetUser = getUserById(parsedReqUserId);
        if (targetUser && targetUser.department_id === session.department_id) {
          targetUserId = parsedReqUserId;
        } else {
          return NextResponse.json({ error: 'Forbidden: Cannot access submissions of another department.' }, { status: 403 });
        }
      } else if (parsedReqUserId !== session.id) {
        return NextResponse.json({ error: 'Forbidden: Faculty can only view their own submissions.' }, { status: 403 });
      }
    }

    // Department-wide or Institution-wide list for HOD, HOI, Admin
    const viewAll = searchParams.get('viewAll') === 'true';
    if (viewAll && (session.role === 'ADMIN' || session.role === 'HOD' || session.role === 'HOI')) {
      let deptQuery = `
        SELECT fs.*, 
               ec.name as category_name, ec.code as category_code, ec.max_marks, ec.target_criteria, ec.scoring_type, ec.order_num,
               u.name as faculty_name, u.college_id as faculty_college_id, u.email as faculty_email, d.name as department_name, d.id as department_id
        FROM faculty_submissions fs
        JOIN evaluation_categories ec ON fs.category_id = ec.id
        JOIN users u ON fs.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE fs.session_id = ?
      `;
      const deptParams: any[] = [sessionId];

      if (session.role === 'HOD' && session.department_id) {
        deptQuery += ' AND u.department_id = ?';
        deptParams.push(session.department_id);
      } else if (departmentId) {
        deptQuery += ' AND u.department_id = ?';
        deptParams.push(parseInt(departmentId, 10));
      }

      if (statusFilter) {
        deptQuery += ' AND fs.status = ?';
        deptParams.push(statusFilter);
      }

      deptQuery += ' ORDER BY u.name ASC, ec.order_num ASC';
      const allSubmissions = db.prepare(deptQuery).all(...deptParams);

      return NextResponse.json({
        success: true,
        submissions: allSubmissions,
      });
    }

    // Default: Fetch all 17 categories for target user and join existing submissions
    const categories = db.prepare(`
      SELECT ec.*, 
             fs.id as submission_id,
             fs.target_input,
             fs.achievement_input,
             fs.details_json,
             fs.calculated_score,
             fs.claimed_score,
             fs.approved_score,
             fs.status as submission_status,
             fs.evidence_url,
             fs.evidence_name,
             fs.faculty_remarks,
             fs.hod_score,
             fs.hod_remarks,
             fs.hod_reviewed_at,
             fs.hoi_score,
             fs.hoi_remarks,
             fs.hoi_reviewed_at,
             fs.director_score,
             fs.director_remarks,
             fs.director_reviewed_at,
             fs.updated_at as submission_updated_at
      FROM evaluation_categories ec
      LEFT JOIN faculty_submissions fs 
        ON ec.id = fs.category_id AND fs.user_id = ? AND fs.session_id = ?
      WHERE ec.role = 'FACULTY'
      ORDER BY ec.order_num ASC
    `).all(targetUserId, sessionId) as any[];

    // Calculate aggregated metrics
    let totalMaxMarks = 0;
    let totalCalculated = 0;
    let totalClaimed = 0;
    let totalApproved = 0;
    let completedCount = 0;

    for (const item of categories) {
      totalMaxMarks += item.max_marks || 0;
      if (item.submission_id && item.submission_status && item.submission_status !== 'DRAFT') {
        completedCount++;
        totalCalculated += item.calculated_score || 0;
        totalClaimed += item.claimed_score || 0;
        if (item.approved_score !== null && item.approved_score !== undefined) {
          totalApproved += item.approved_score;
        }
      }
    }

    // Fetch review history for this user's submissions
    const reviews = db.prepare(`
      SELECT r.*, u.name as reviewer_name, ec.name as category_name
      FROM reviews r
      JOIN faculty_submissions fs ON r.submission_id = fs.id
      JOIN evaluation_categories ec ON fs.category_id = ec.id
      JOIN users u ON r.reviewer_id = u.id
      WHERE fs.user_id = ? AND fs.session_id = ?
      ORDER BY r.reviewed_at DESC
    `).all(targetUserId, sessionId);

    return NextResponse.json({
      success: true,
      categories,
      metrics: {
        totalMaxMarks,
        totalCalculated: Math.round(totalCalculated * 100) / 100,
        totalClaimed: Math.round(totalClaimed * 100) / 100,
        totalApproved: Math.round(totalApproved * 100) / 100,
        completedCategories: completedCount,
        totalCategories: categories.length,
        completionPercentage: categories.length > 0 ? Math.round((completedCount / categories.length) * 100) : 0,
      },
      reviews,
    });
  } catch (error: any) {
    console.error('Submissions GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      categoryId,
      sessionId = 1,
      targetInput = '',
      achievementInput,
      details = {},
      claimedScore,
      action = 'SUBMIT', // 'DRAFT' or 'SUBMIT'
      evidenceUrl = '',
      evidenceName = '',
      remarks = '',
    } = body;

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    const db = getDb();
    const category = db.prepare('SELECT * FROM evaluation_categories WHERE id = ?').get(categoryId) as any;
    if (!category) {
      return NextResponse.json({ error: 'Invalid Category ID.' }, { status: 404 });
    }

    // Check if there is an existing submission
    const existing = db.prepare(`
      SELECT * FROM faculty_submissions 
      WHERE user_id = ? AND category_id = ? AND session_id = ?
    `).get(session.id, categoryId, sessionId) as any;

    if (existing && existing.status === 'APPROVED' && session.role !== 'ADMIN') {
      return NextResponse.json({
        error: 'This evaluation item has already received Final Institutional Approval and cannot be modified.',
      }, { status: 403 });
    }

    // Auto-compute score using institutional scoring engine
    const scoreResult = computeFacultyScore({
      categoryCode: category.code,
      target: targetInput,
      achievement: achievementInput,
      details,
    });

    const calculatedScore = scoreResult.calculatedScore;
    const finalClaimedScore = claimedScore !== undefined && claimedScore !== null
      ? Math.min(parseFloat(claimedScore) || 0, category.max_marks)
      : calculatedScore;

    // Status progression: Submitting sends to HOD
    const newStatus = action === 'DRAFT' ? 'DRAFT' : 'SUBMITTED_TO_HOD';
    const now = new Date().toISOString();

    let submissionId: number;

    if (existing) {
      db.prepare(`
        UPDATE faculty_submissions
        SET target_input = ?,
            achievement_input = ?,
            details_json = ?,
            calculated_score = ?,
            claimed_score = ?,
            status = ?,
            evidence_url = ?,
            evidence_name = ?,
            faculty_remarks = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        targetInput,
        achievementInput,
        JSON.stringify(details),
        calculatedScore,
        finalClaimedScore,
        newStatus,
        evidenceUrl || existing.evidence_url,
        evidenceName || existing.evidence_name,
        remarks || existing.faculty_remarks,
        now,
        existing.id
      );
      submissionId = existing.id;
    } else {
      const insertResult = db.prepare(`
        INSERT INTO faculty_submissions (
          user_id, category_id, session_id,
          target_input, achievement_input, details_json,
          calculated_score, claimed_score, status,
          evidence_url, evidence_name, faculty_remarks,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.id,
        categoryId,
        sessionId,
        targetInput,
        achievementInput,
        JSON.stringify(details),
        calculatedScore,
        finalClaimedScore,
        newStatus,
        evidenceUrl,
        evidenceName,
        remarks,
        now,
        now
      );
      submissionId = Number(insertResult.lastInsertRowid);
    }

    // Audit log
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      action === 'DRAFT' ? 'SAVE_DRAFT' : 'SUBMIT_TO_HOD',
      'FACULTY_SUBMISSION',
      String(submissionId),
      JSON.stringify({
        categoryId,
        categoryName: category.name,
        calculatedScore,
        claimedScore: finalClaimedScore,
        status: newStatus,
      }),
      clientIp,
      now
    );

    return NextResponse.json({
      success: true,
      submissionId,
      calculatedScore,
      claimedScore: finalClaimedScore,
      status: newStatus,
      message: action === 'DRAFT' 
        ? 'Draft saved successfully.' 
        : 'Submission submitted to Head of Department (HOD) for verification.',
    });
  } catch (error: any) {
    console.error('Submission POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
