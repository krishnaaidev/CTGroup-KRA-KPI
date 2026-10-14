import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'faculty'; // 'faculty', 'hod', 'hoi', 'all'
    const departmentId = searchParams.get('departmentId');
    const sessionId = searchParams.get('sessionId') || '1';
    const format = searchParams.get('format') || 'xlsx';

    const db = getDb();
    const wb = XLSX.utils.book_new();

    // 1. Faculty KRA & KPI Performance Sheet
    if (type === 'faculty' || type === 'all') {
      let facultyQuery = `
        SELECT 
          u.name as Faculty_Name,
          u.college_id as College_ID,
          u.email as Email,
          d.name as Department,
          ec.name as Evaluation_Category,
          ec.max_marks as Max_Marks,
          fs.target_input as Target,
          fs.achievement_input as Achievement,
          COALESCE(fs.calculated_score, 0) as Auto_Calculated_Score,
          COALESCE(fs.claimed_score, 0) as Claimed_Score,
          COALESCE(fs.approved_score, 'Pending') as Approved_Score,
          COALESCE(fs.status, 'NOT_SUBMITTED') as Status,
          fs.evidence_name as Evidence_File,
          fs.faculty_remarks as Remarks,
          fs.updated_at as Last_Updated
        FROM users u
        CROSS JOIN evaluation_categories ec
        LEFT JOIN faculty_submissions fs 
          ON u.id = fs.user_id AND ec.id = fs.category_id AND fs.session_id = ?
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = 'FACULTY' AND ec.role = 'FACULTY'
      `;
      const facultyParams: any[] = [sessionId];

      if (session.role === 'FACULTY') {
        facultyQuery += ' AND u.id = ?';
        facultyParams.push(session.id);
      } else if (session.role === 'HOD' && session.department_id) {
        facultyQuery += ' AND u.department_id = ?';
        facultyParams.push(session.department_id);
      } else if (departmentId) {
        facultyQuery += ' AND u.department_id = ?';
        facultyParams.push(parseInt(departmentId, 10));
      }

      facultyQuery += ' ORDER BY u.name ASC, ec.order_num ASC';
      const facultyData = db.prepare(facultyQuery).all(...facultyParams);

      const wsFaculty = XLSX.utils.json_to_sheet(facultyData);
      XLSX.utils.book_append_sheet(wb, wsFaculty, 'Faculty_Evaluation');

      // Aggregate Summary Sheet (Faculty-wise Total out of 1000)
      let summaryQuery = `
        SELECT 
          u.name as Faculty_Name,
          u.college_id as College_ID,
          d.name as Department,
          1000 as Total_Max_Marks,
          SUM(COALESCE(fs.calculated_score, 0)) as Total_Calculated_Marks,
          SUM(COALESCE(fs.claimed_score, 0)) as Total_Claimed_Marks,
          SUM(COALESCE(fs.approved_score, 0)) as Total_Approved_Marks,
          COUNT(CASE WHEN fs.status = 'APPROVED' THEN 1 END) as Approved_Items_Count,
          COUNT(CASE WHEN fs.status = 'SUBMITTED' THEN 1 END) as Pending_Items_Count,
          ROUND((SUM(COALESCE(fs.approved_score, 0)) / 1000.0) * 100, 2) as Overall_Score_Percentage
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN faculty_submissions fs ON u.id = fs.user_id AND fs.session_id = ?
        WHERE u.role = 'FACULTY'
      `;
      const sumParams: any[] = [sessionId];
      if (session.role === 'FACULTY') {
        summaryQuery += ' AND u.id = ?';
        sumParams.push(session.id);
      } else if (session.role === 'HOD' && session.department_id) {
        summaryQuery += ' AND u.department_id = ?';
        sumParams.push(session.department_id);
      }
      summaryQuery += ' GROUP BY u.id ORDER BY Total_Approved_Marks DESC';

      const summaryData = db.prepare(summaryQuery).all(...sumParams);
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Faculty_Summary');
    }

    // 2. HOD Evaluation Sheet (400 Dept + 600 Self = 1000 Marks)
    if (type === 'hod' || type === 'all') {
      const hodData = db.prepare(`
        SELECT 
          u.name as HOD_Name,
          u.college_id as College_ID,
          d.name as Department,
          he.dept_score as Department_Score_Max_400,
          he.self_score as Self_Score_Max_600,
          he.total_score as Total_Score_Max_1000,
          he.status as Evaluation_Status,
          he.admin_remarks as Admin_Remarks,
          he.submitted_at as Submitted_At
        FROM users u
        JOIN departments d ON u.id = d.hod_user_id
        LEFT JOIN hod_evaluations he ON u.id = he.hod_id AND he.session_id = ?
        WHERE u.role = 'HOD'
      `).all(sessionId);

      const wsHod = XLSX.utils.json_to_sheet(hodData);
      XLSX.utils.book_append_sheet(wb, wsHod, 'HOD_Evaluations');
    }

    // 3. HOI Evaluation Sheet (500 Inst + 500 Self = 1000 Marks)
    if (type === 'hoi' || type === 'all') {
      const hoiData = db.prepare(`
        SELECT 
          u.name as HOI_Name,
          u.college_id as College_ID,
          u.designation as Designation,
          he.inst_score as Institutional_Score_Max_500,
          he.self_score as Self_Score_Max_500,
          he.total_score as Total_Score_Max_1000,
          he.status as Evaluation_Status,
          he.authority_remarks as Authority_Remarks,
          he.submitted_at as Submitted_At
        FROM users u
        LEFT JOIN hoi_evaluations he ON u.id = he.hoi_id AND he.session_id = ?
        WHERE u.role = 'HOI'
      `).all(sessionId);

      const wsHoi = XLSX.utils.json_to_sheet(hoiData);
      XLSX.utils.book_append_sheet(wb, wsHoi, 'HOI_Evaluations');
    }

    if (format === 'json') {
      return NextResponse.json({ success: true, workbook: wb });
    }

    // Generate Excel Buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `CT_Group_KRA_KPI_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
