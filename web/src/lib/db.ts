import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Resolve database path in the project directory
const dbPath = path.join(process.cwd(), 'ctgroup_kpi.db');
let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
  }
  return db;
}

function initDb(database: Database.Database) {
  // 1. Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      college_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'HOD', 'HOI', 'FACULTY')),
      department_id INTEGER,
      designation TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK(status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
      avatar TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Academic Sessions
  database.exec(`
    CREATE TABLE IF NOT EXISTS academic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      submission_deadline TEXT NOT NULL
    );
  `);

  // 3. Departments
  database.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      hod_user_id INTEGER
    );
  `);

  // 4. Evaluation Categories
  database.exec(`
    CREATE TABLE IF NOT EXISTS evaluation_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('FACULTY', 'HOD', 'HOI')),
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      section TEXT DEFAULT 'FACULTY',
      description TEXT,
      target_criteria TEXT,
      max_marks INTEGER NOT NULL,
      scoring_type TEXT NOT NULL,
      scoring_rules_json TEXT,
      order_num INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 5. Faculty Submissions (also handles general submission records)
  database.exec(`
    CREATE TABLE IF NOT EXISTS faculty_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES evaluation_categories(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
      target_input TEXT DEFAULT '',
      achievement_input TEXT DEFAULT '',
      details_json TEXT DEFAULT '{}',
      calculated_score REAL NOT NULL DEFAULT 0,
      claimed_score REAL NOT NULL DEFAULT 0,
      approved_score REAL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMITTED')),
      evidence_url TEXT,
      evidence_name TEXT,
      faculty_remarks TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, category_id, session_id)
    );
  `);

  // 6. Supporting Documents
  database.exec(`
    CREATE TABLE IF NOT EXISTS supporting_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER REFERENCES faculty_submissions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
  `);

  // 7. Reviews
  database.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES faculty_submissions(id) ON DELETE CASCADE,
      reviewer_id INTEGER NOT NULL REFERENCES users(id),
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      comments TEXT NOT NULL,
      approved_score REAL NOT NULL,
      reviewed_at TEXT NOT NULL
    );
  `);

  // 8. HOD Evaluations (400 Dept + 600 Self = 1000 Total)
  database.exec(`
    CREATE TABLE IF NOT EXISTS hod_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hod_id INTEGER NOT NULL REFERENCES users(id),
      department_id INTEGER NOT NULL REFERENCES departments(id),
      session_id INTEGER NOT NULL REFERENCES academic_sessions(id),
      dept_score REAL NOT NULL DEFAULT 0,
      self_score REAL NOT NULL DEFAULT 0,
      total_score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
      admin_remarks TEXT,
      submitted_at TEXT,
      reviewed_at TEXT,
      UNIQUE(hod_id, session_id)
    );
  `);

  // 9. HOI Evaluations (500 Inst + 500 Self = 1000 Total)
  database.exec(`
    CREATE TABLE IF NOT EXISTS hoi_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hoi_id INTEGER NOT NULL REFERENCES users(id),
      session_id INTEGER NOT NULL REFERENCES academic_sessions(id),
      inst_score REAL NOT NULL DEFAULT 0,
      self_score REAL NOT NULL DEFAULT 0,
      total_score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
      authority_remarks TEXT,
      submitted_at TEXT,
      reviewed_at TEXT,
      UNIQUE(hoi_id, session_id)
    );
  `);

  // 10. Audit Logs
  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      record_type TEXT NOT NULL,
      record_id TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed data if empty
  seedInitialData(database);
}

function seedInitialData(database: Database.Database) {
  const sessionCount = database.prepare('SELECT count(*) as count FROM academic_sessions').get() as { count: number };
  if (sessionCount.count === 0) {
    database.prepare(`
      INSERT INTO academic_sessions (name, is_active, start_date, end_date, submission_deadline)
      VALUES (?, ?, ?, ?, ?)
    `).run('2026-2027', 1, '2026-07-01', '2027-06-30', '2026-12-31');
  }

  // Seed Departments
  const deptCount = database.prepare('SELECT count(*) as count FROM departments').get() as { count: number };
  if (deptCount.count === 0) {
    const insertDept = database.prepare('INSERT INTO departments (name, code) VALUES (?, ?)');
    insertDept.run('Computer Science & Engineering', 'CSE');
    insertDept.run('Information Technology', 'IT');
    insertDept.run('Mechanical Engineering', 'ME');
    insertDept.run('Electronics & Communication', 'ECE');
    insertDept.run('Management Studies', 'MBA');
    insertDept.run('Pharmaceutical Sciences', 'PHARM');
    insertDept.run('Hotel Management & Catering', 'HMCT');
  }

  // Seed Users
  const userCount = database.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const now = new Date().toISOString();
    const adminPasswordHash = bcrypt.hashSync('CTAdmin@2026', 10);
    const facultyPasswordHash = bcrypt.hashSync('Faculty@123', 10);
    const hodPasswordHash = bcrypt.hashSync('HOD@123', 10);
    const hoiPasswordHash = bcrypt.hashSync('HOI@123', 10);

    const insertUser = database.prepare(`
      INSERT INTO users (id, name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Initial Admin (ID: 20, email: developer@ctgroup.in as stated in PRD Section 2)
    insertUser.run(
      20,
      'System Administrator',
      '20',
      'developer@ctgroup.in',
      '+91 98765 43210',
      adminPasswordHash,
      'ADMIN',
      null,
      'Director IT / System Admin',
      'APPROVED',
      now,
      now
    );

    // 2. Demo HOD (CSE Department ID: 1)
    insertUser.run(
      21,
      'Dr. Rajesh Sharma',
      'CT-HOD-201',
      'hod.cse@ctgroup.in',
      '+91 98765 11111',
      hodPasswordHash,
      'HOD',
      1,
      'Professor & Head of Department',
      'APPROVED',
      now,
      now
    );
    database.prepare('UPDATE departments SET hod_user_id = 21 WHERE id = 1').run();

    // 3. Demo HOI (Head of Institution)
    insertUser.run(
      22,
      'Dr. Gurpreet Singh',
      'CT-HOI-301',
      'hoi.engg@ctgroup.in',
      '+91 98765 22222',
      hoiPasswordHash,
      'HOI',
      null,
      'Director / Campus Director',
      'APPROVED',
      now,
      now
    );

    // 4. Demo Faculty (Approved)
    insertUser.run(
      23,
      'Prof. Ananya Verma',
      'CT-FAC-101',
      'faculty.cse@ctgroup.in',
      '+91 98765 33333',
      facultyPasswordHash,
      'FACULTY',
      1,
      'Assistant Professor (Senior Scale)',
      'APPROVED',
      now,
      now
    );

    // 5. Demo Faculty (Pending Approval)
    insertUser.run(
      24,
      'Prof. Vikram Malhotra',
      'CT-FAC-102',
      'vikram.cse@ctgroup.in',
      '+91 98765 44444',
      facultyPasswordHash,
      'FACULTY',
      1,
      'Assistant Professor',
      'PENDING_APPROVAL',
      now,
      now
    );
  }

  // Seed Categories (Faculty 17 Categories = 1000 Marks, HOD 400/600, HOI 500/500)
  const catCount = database.prepare('SELECT count(*) as count FROM evaluation_categories').get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = database.prepare(`
      INSERT INTO evaluation_categories 
      (role, code, name, section, description, target_criteria, max_marks, scoring_type, scoring_rules_json, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 17 Faculty Categories (Total = 1,000 Marks)
    const facultyCategories = [
      {
        role: 'FACULTY',
        code: 'CAT_LESSON_PLAN',
        name: 'Lesson Plan & Academic Delivery',
        section: 'FACULTY',
        description: 'Semester lecture notes, delivery plan and weekly completion logs verified on institutional Google Sheets.',
        target_criteria: '100% semester topics covered (uploaded/verified on Google Sheets)',
        max_marks: 50,
        scoring_type: 'BINARY',
        scoring_rules_json: JSON.stringify({ type: 'BINARY', threshold: 100, passMarks: 50, failMarks: 0 }),
        order_num: 1,
      },
      {
        role: 'FACULTY',
        code: 'CAT_RESULT',
        name: 'Result Performance',
        section: 'FACULTY',
        description: 'Subject pass percentage and academic grading outcome for all university exams taught in the academic session.',
        target_criteria: 'Scored via prescribed subject result percentage slabs',
        max_marks: 150,
        scoring_type: 'SLAB_RESULT_ATTENDANCE',
        scoring_rules_json: JSON.stringify({
          slabs: [
            { min: 0, max: 49.99, marks: 0 },
            { min: 50, max: 60, marks: 40 },
            { min: 60.01, max: 70, marks: 80 },
            { min: 70.01, max: 80, marks: 100 },
            { min: 80.01, max: 90, marks: 110 },
            { min: 90.01, max: 95, marks: 120 },
            { min: 95.01, max: 100, marks: 150 },
          ],
        }),
        order_num: 2,
      },
      {
        role: 'FACULTY',
        code: 'CAT_ATTENDANCE',
        name: 'Student Attendance',
        section: 'FACULTY',
        description: 'Average biometric/ERP student classroom attendance across all subjects taught by the faculty.',
        target_criteria: 'Average attendance across all subjects taught by the faculty',
        max_marks: 150,
        scoring_type: 'SLAB_RESULT_ATTENDANCE',
        scoring_rules_json: JSON.stringify({
          slabs: [
            { min: 0, max: 49.99, marks: 0 },
            { min: 50, max: 60, marks: 40 },
            { min: 60.01, max: 70, marks: 80 },
            { min: 70.01, max: 80, marks: 100 },
            { min: 80.01, max: 90, marks: 110 },
            { min: 90.01, max: 95, marks: 120 },
            { min: 95.01, max: 100, marks: 150 },
          ],
        }),
        order_num: 3,
      },
      {
        role: 'FACULTY',
        code: 'CAT_FEEDBACK',
        name: 'Student Feedback',
        section: 'FACULTY',
        description: 'Formal student appraisal rating conducted at semester mid/end (requires minimum 5 student responses).',
        target_criteria: 'Min. average 4/5, with at least 5 responses per semester',
        max_marks: 50,
        scoring_type: 'SLAB_FEEDBACK',
        scoring_rules_json: JSON.stringify({ minResponses: 5, slabs: [{ max: 3.99, marks: 0 }, { min: 4.0, max: 4.5, marks: 25 }, { min: 4.51, marks: 50 }] }),
        order_num: 4,
      },
      {
        role: 'FACULTY',
        code: 'CAT_ADMISSION',
        name: 'Admissions Contribution',
        section: 'FACULTY',
        description: 'Outreach, school/college counseling drives, and confirmed prospective student admissions enrolled.',
        target_criteria: '2 marks per verified admission (Max 50)',
        max_marks: 50,
        scoring_type: 'PER_UNIT_ADMISSION',
        scoring_rules_json: JSON.stringify({ marksPerUnit: 2, cap: 50 }),
        order_num: 5,
      },
      {
        role: 'FACULTY',
        code: 'CAT_TEACHING_LOAD',
        name: 'Teaching Load',
        section: 'FACULTY',
        description: 'Conducting 100% of assigned lecture, tutorial, and lab contact hours per departmental timetable.',
        target_criteria: '100% of classes conducted according to timetable',
        max_marks: 30,
        scoring_type: 'BINARY',
        scoring_rules_json: JSON.stringify({ type: 'BINARY', threshold: 100, passMarks: 30, failMarks: 0 }),
        order_num: 6,
      },
      {
        role: 'FACULTY',
        code: 'CAT_COURSE_FILE',
        name: 'Course File Maintenance',
        section: 'FACULTY',
        description: 'Comprehensive course file with syllabus, CO-PO mapping, question banks, lab manuals, sample scripts.',
        target_criteria: '100% complete and updated during inspection',
        max_marks: 20,
        scoring_type: 'BINARY',
        scoring_rules_json: JSON.stringify({ type: 'BINARY', threshold: 100, passMarks: 20, failMarks: 0 }),
        order_num: 7,
      },
      {
        role: 'FACULTY',
        code: 'CAT_PUBLICATIONS',
        name: 'Research Publications',
        section: 'FACULTY',
        description: 'Scopus / Web of Science indexed journal publications. First-author only.',
        target_criteria: '1 Scopus/WoS pub/year; first-author only (1st: 15, 2nd: 15, 3rd: 10, 4th: 10)',
        max_marks: 50,
        scoring_type: 'PUBLICATIONS',
        scoring_rules_json: JSON.stringify({ steps: [15, 15, 10, 10], cap: 50 }),
        order_num: 8,
      },
      {
        role: 'FACULTY',
        code: 'CAT_BOOKS',
        name: 'Books / Book Chapters',
        section: 'FACULTY',
        description: 'Peer-reviewed scholarly textbooks, edited volumes, or indexed book chapters with ISBN. First-author only.',
        target_criteria: '2 eligible pubs/year; first-author only (1st: 15, 2nd: 15, 3rd: 10, 4th: 10)',
        max_marks: 50,
        scoring_type: 'BOOKS',
        scoring_rules_json: JSON.stringify({ steps: [15, 15, 10, 10], cap: 50 }),
        order_num: 9,
      },
      {
        role: 'FACULTY',
        code: 'CAT_RESEARCH_PROJECTS',
        name: 'Research Project',
        section: 'FACULTY',
        description: 'Externally submitted grant proposals or sanctioned research projects funded by DST/SERB/AICTE/industry.',
        target_criteria: 'Submitted = 10 each, Sanctioned = 20 each (Max 40)',
        max_marks: 40,
        scoring_type: 'PROJECTS',
        scoring_rules_json: JSON.stringify({ submittedMarks: 10, sanctionedMarks: 20, cap: 40 }),
        order_num: 10,
      },
      {
        role: 'FACULTY',
        code: 'CAT_CONFERENCES',
        name: 'Conference Participation',
        section: 'FACULTY',
        description: 'Paper presentations or session chairing in recognized national/international peer-reviewed conferences.',
        target_criteria: 'Min. 2 national/international per year (5 marks per eligible item, Max 30)',
        max_marks: 30,
        scoring_type: 'PER_UNIT_PARTICIPATION',
        scoring_rules_json: JSON.stringify({ marksPerUnit: 5, cap: 30 }),
        order_num: 11,
      },
      {
        role: 'FACULTY',
        code: 'CAT_FDP',
        name: 'FDP / Workshop Participation',
        section: 'FACULTY',
        description: 'Faculty Development Programs / AICTE ATAL / NPTEL workshops of minimum 5 days duration.',
        target_criteria: 'Min. 2 per year (5 days duration) (5 marks per eligible item, Max 30)',
        max_marks: 30,
        scoring_type: 'PER_UNIT_PARTICIPATION',
        scoring_rules_json: JSON.stringify({ marksPerUnit: 5, cap: 30 }),
        order_num: 12,
      },
      {
        role: 'FACULTY',
        code: 'CAT_CERTIFICATIONS',
        name: 'Additional Certification',
        section: 'FACULTY',
        description: 'NASSCOM FutureSkills Prime or recognized skill certifications (min 30 hours with proctored assessment).',
        target_criteria: '1 NASSCOM cert/semester (min 30 hrs with assessment) (5 marks per item, Max 20)',
        max_marks: 20,
        scoring_type: 'PER_UNIT_PARTICIPATION',
        scoring_rules_json: JSON.stringify({ marksPerUnit: 5, cap: 20 }),
        order_num: 13,
      },
      {
        role: 'FACULTY',
        code: 'CAT_MENTORSHIP',
        name: 'Mentorship',
        section: 'FACULTY',
        description: 'Percentage of assigned student mentees completing >= 1 NASSCOM certification per semester.',
        target_criteria: '% of mentees completing >= 1 NASSCOM cert/semester (<70: 0, 70-80: 20, 80-90: 60, 90-95: 80, >95: 100)',
        max_marks: 100,
        scoring_type: 'SLAB_MENTORSHIP_ALUMNI',
        scoring_rules_json: JSON.stringify({
          slabs: [
            { min: 0, max: 69.99, marks: 0 },
            { min: 70, max: 80, marks: 20 },
            { min: 80.01, max: 90, marks: 60 },
            { min: 90.01, max: 95, marks: 80 },
            { min: 95.01, max: 100, marks: 100 },
          ],
        }),
        order_num: 14,
      },
      {
        role: 'FACULTY',
        code: 'CAT_ALUMNI',
        name: 'Alumni Engagement',
        section: 'FACULTY',
        description: 'Percentage of assigned department alumni verified and actively engaged through the Vaave portal.',
        target_criteria: '% of assigned alumni updated/engaged through Vaave (<70: 0, 70-80: 20, 80-90: 60, 90-95: 80, >95: 100)',
        max_marks: 100,
        scoring_type: 'SLAB_MENTORSHIP_ALUMNI',
        scoring_rules_json: JSON.stringify({
          slabs: [
            { min: 0, max: 69.99, marks: 0 },
            { min: 70, max: 80, marks: 20 },
            { min: 80.01, max: 90, marks: 60 },
            { min: 90.01, max: 95, marks: 80 },
            { min: 95.01, max: 100, marks: 100 },
          ],
        }),
        order_num: 15,
      },
      {
        role: 'FACULTY',
        code: 'CAT_EVENT_COORD',
        name: 'Event Coordination',
        section: 'FACULTY',
        description: 'Organizing national/international conferences, seminars, technical symposiums, hackathons, or FDPs.',
        target_criteria: 'Min. 1 event/semester (1st: 15, 2nd: 15, 3rd: 10, Max 40)',
        max_marks: 40,
        scoring_type: 'EVENTS',
        scoring_rules_json: JSON.stringify({ steps: [15, 15, 10], cap: 40 }),
        order_num: 16,
      },
      {
        role: 'FACULTY',
        code: 'CAT_ADMIN_RESP',
        name: 'Admin Responsibilities',
        section: 'FACULTY',
        description: 'Assigned institutional/departmental portfolios (NAAC coordinator, examination in-charge, lab warden, IQAC, admissions duty).',
        target_criteria: '100% assigned duties completed within timeline',
        max_marks: 40,
        scoring_type: 'BINARY',
        scoring_rules_json: JSON.stringify({ type: 'BINARY', threshold: 100, passMarks: 40, failMarks: 0 }),
        order_num: 17,
      },
    ];

    for (const cat of facultyCategories) {
      insertCat.run(
        cat.role,
        cat.code,
        cat.name,
        cat.section,
        cat.description,
        cat.target_criteria,
        cat.max_marks,
        cat.scoring_type,
        cat.scoring_rules_json,
        cat.order_num
      );
    }

    // HOD Categories: Departmental Performance (400 Marks) + Self Performance (600 Marks) = 1,000 Marks
    const hodCategories = [
      {
        role: 'HOD',
        code: 'HOD_DEPT_ACADEMIC',
        name: 'Department Academic & University Results',
        section: 'DEPT',
        description: 'Average department pass percentage across all semesters and university rank holders.',
        target_criteria: 'Target 85%+ overall pass rate',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 100 }),
        order_num: 101,
      },
      {
        role: 'HOD',
        code: 'HOD_DEPT_PLACEMENT',
        name: 'Placement & Internship Conversion',
        section: 'DEPT',
        description: 'Percentage of eligible final year department students placed and core internships secured.',
        target_criteria: 'Target 80%+ placement conversion',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 100 }),
        order_num: 102,
      },
      {
        role: 'HOD',
        code: 'HOD_DEPT_RESEARCH',
        name: 'Faculty Research & Grant Output',
        section: 'DEPT',
        description: 'Cumulative department research publications (Scopus/WoS), patents filed, and external project grants.',
        target_criteria: 'Minimum 10 publications and 1 funded project per department',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 100 }),
        order_num: 103,
      },
      {
        role: 'HOD',
        code: 'HOD_DEPT_ACCREDITATION',
        name: 'Accreditation, NBA/NAAC Readiness & Compliance',
        section: 'DEPT',
        description: 'Maintenance of Criteria files, SAR preparation, continuous outcome-based education (OBE) compliance.',
        target_criteria: '100% compliance during internal and university audits',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 100 }),
        order_num: 104,
      },
      // HOD Self Performance (600 Marks)
      {
        role: 'HOD',
        code: 'HOD_SELF_ACADEMIC_PLAN',
        name: 'Academic Planning & Curriculum Execution',
        section: 'SELF',
        description: 'Timetable design, load distribution, academic calendar adherence, and syllabus tracking.',
        target_criteria: 'Timely commencement, zero lecture disruption, 100% timetable coverage',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 150 }),
        order_num: 105,
      },
      {
        role: 'HOD',
        code: 'HOD_SELF_FACULTY_DEV',
        name: 'Faculty Coordination & Mentoring',
        section: 'SELF',
        description: 'Faculty performance appraisal, conflict resolution, mentoring junior faculty, FDP nominations.',
        target_criteria: '100% faculty appraisals completed and development roadmaps submitted',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 150 }),
        order_num: 106,
      },
      {
        role: 'HOD',
        code: 'HOD_SELF_STUDENT_ENGAGEMENT',
        name: 'Student Grievance & Technical Clubs Governance',
        section: 'SELF',
        description: 'Department club activities, mentoring program oversight, industrial visits, guest lectures.',
        target_criteria: 'Minimum 4 club events and 100% grievance resolution within 7 days',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 150 }),
        order_num: 107,
      },
      {
        role: 'HOD',
        code: 'HOD_SELF_ADMIN_LEADERSHIP',
        name: 'Administrative Leadership & Strategic Vision',
        section: 'SELF',
        description: 'Departmental budget management, procurement, institutional committee participation.',
        target_criteria: 'On-time budget submission and strategic growth targets met',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 150 }),
        order_num: 108,
      },
    ];

    for (const cat of hodCategories) {
      insertCat.run(
        cat.role,
        cat.code,
        cat.name,
        cat.section,
        cat.description,
        cat.target_criteria,
        cat.max_marks,
        cat.scoring_type,
        cat.scoring_rules_json,
        cat.order_num
      );
    }

    // HOI Categories: Institutional Performance (500 Marks) + Self Performance (500 Marks) = 1,000 Marks
    const hoiCategories = [
      {
        role: 'HOI',
        code: 'HOI_INST_ADMISSIONS',
        name: 'Campus Admissions & Intake Fulfillment',
        section: 'INST',
        description: 'Overall student enrollment percentage against AICTE sanctioned intake across all branches.',
        target_criteria: 'Achieve >= 90% seat fulfillment across campus',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 150 }),
        order_num: 201,
      },
      {
        role: 'HOI',
        code: 'HOI_INST_ACCREDITATION_NIRF',
        name: 'NAAC, NBA & NIRF Rankings Leadership',
        section: 'INST',
        description: 'Preparation, submission and score enhancement for national and state institutional ranking frameworks.',
        target_criteria: 'Maintain A+ NAAC grade and top NIRF innovation ranking band',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 150 }),
        order_num: 202,
      },
      {
        role: 'HOI',
        code: 'HOI_INST_PLACEMENTS_MOUS',
        name: 'Campus Placements & Corporate MoUs',
        section: 'INST',
        description: 'Tier-1 company visits, highest/average CTC package growth, and active industry partnerships.',
        target_criteria: 'Min 25 corporate MoUs and 85%+ institutional placement rate',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 100 }),
        order_num: 203,
      },
      {
        role: 'HOI',
        code: 'HOI_INST_INFRA_RESEARCH',
        name: 'Campus Infrastructure & Research Grants',
        section: 'INST',
        description: 'Incubation centre establishment, modern labs, external research funding acquisition.',
        target_criteria: 'Attain min 50 Lakhs research/consultancy funding',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 100 }),
        order_num: 204,
      },
      // HOI Self Performance (500 Marks)
      {
        role: 'HOI',
        code: 'HOI_SELF_STRATEGIC',
        name: 'Institutional Governance & Strategic Roadmap',
        section: 'SELF',
        description: 'Strategic 5-year vision implementation, compliance with statutory bodies (AICTE, UGC, University).',
        target_criteria: '100% regulatory compliance and strategic milestones met',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 150 }),
        order_num: 205,
      },
      {
        role: 'HOI',
        code: 'HOI_SELF_FISCAL',
        name: 'Fiscal Management & Financial Sustainability',
        section: 'SELF',
        description: 'Optimal budget allocation, revenue generation through self-finance initiatives and cost efficiency.',
        target_criteria: 'Adherence to campus budget targets with surplus sustainability',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 150 }),
        order_num: 206,
      },
      {
        role: 'HOI',
        code: 'HOI_SELF_STAFF_DEV',
        name: 'Leadership Development & Faculty Retention',
        section: 'SELF',
        description: 'Faculty retention rates, HOD performance reviews, leadership development programs.',
        target_criteria: 'Faculty retention >= 90% and 100% HOD leadership reviews executed',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 100 }),
        order_num: 207,
      },
      {
        role: 'HOI',
        code: 'HOI_SELF_COMMUNITY_BRAND',
        name: 'Brand Enhancement & Community Impact',
        section: 'SELF',
        description: 'Institutional visibility, public relations, CSR projects, and regional societal impact.',
        target_criteria: 'Active regional CSR programs and sustained national branding campaigns',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: JSON.stringify({ cap: 100 }),
        order_num: 208,
      },
    ];

    for (const cat of hoiCategories) {
      insertCat.run(
        cat.role,
        cat.code,
        cat.name,
        cat.section,
        cat.description,
        cat.target_criteria,
        cat.max_marks,
        cat.scoring_type,
        cat.scoring_rules_json,
        cat.order_num
      );
    }
  }

  // Pre-seed some faculty submissions for demo user (Prof. Ananya Verma - ID 23) so charts & dashboards immediately look alive
  const subCount = database.prepare('SELECT count(*) as count FROM faculty_submissions').get() as { count: number };
  if (subCount.count === 0) {
    const insertSub = database.prepare(`
      INSERT INTO faculty_submissions
      (user_id, category_id, session_id, target_input, achievement_input, details_json, calculated_score, claimed_score, approved_score, status, evidence_url, evidence_name, faculty_remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    // 1. Lesson plan: 100% -> 50 marks (Approved)
    insertSub.run(23, 1, 1, '100%', '100%', JSON.stringify({ sheetUrl: 'https://docs.google.com/spreadsheets/d/ctgroup-cse-lesson-plans' }), 50, 50, 50, 'APPROVED', 'https://docs.google.com/spreadsheets/d/ctgroup-cse-lesson-plans', 'Google Sheets Lesson Plan Verified', 'All 48 lectures completed according to syllabus.', now, now);

    // 2. Result: 92% -> 120 marks (Approved)
    insertSub.run(23, 2, 1, '90%+', '92.4%', JSON.stringify({ totalStudents: 65, passed: 60 }), 120, 120, 120, 'APPROVED', 'https://ctgroup.in/evidence/cse/results-sem6.pdf', 'University Results Gazette 2026.pdf', '60 out of 65 students cleared subject with 8 distinctions.', now, now);

    // 3. Attendance: 88% -> 110 marks (Approved)
    insertSub.run(23, 3, 1, '85%+', '88.5%', JSON.stringify({ totalClasses: 52, averageAttendance: 88.5 }), 110, 110, 110, 'APPROVED', 'https://ctgroup.in/evidence/cse/attendance-log.pdf', 'ERP Biometric Attendance Report.pdf', 'Consistent student attendance monitored weekly.', now, now);

    // 4. Feedback: 4.6/5 -> 50 marks (Approved)
    insertSub.run(23, 4, 1, '>=4.5', '4.65', JSON.stringify({ responsesCount: 58 }), 50, 50, 50, 'APPROVED', 'https://ctgroup.in/evidence/cse/student-feedback.pdf', 'Student Appraisal Summary 2026.pdf', '58 responses collected through anonymous institutional portal.', now, now);

    // 5. Admissions: 12 admissions -> 24 marks (Submitted)
    insertSub.run(23, 5, 1, '15 admissions', '12', JSON.stringify({ admissions: 12 }), 24, 24, null, 'SUBMITTED', 'https://ctgroup.in/evidence/cse/admissions-verification.pdf', 'Admissions Office Verification Slip.pdf', 'Organized 3 career counseling sessions at local senior secondary schools.', now, now);

    // 6. Teaching Load: 100% -> 30 marks (Approved)
    insertSub.run(23, 6, 1, '100%', '100%', JSON.stringify({ conducted: 14, allotted: 14 }), 30, 30, 30, 'APPROVED', 'https://ctgroup.in/evidence/cse/timetable-compliance.pdf', 'Time Table Compliance Certificate.pdf', 'No lecture cancellation; all alternate classes adjusted.', now, now);

    // 7. Course File: 100% -> 20 marks (Approved)
    insertSub.run(23, 7, 1, '100%', '100%', JSON.stringify({ isComplete: true }), 20, 20, 20, 'APPROVED', 'https://ctgroup.in/evidence/cse/course-file-index.pdf', 'Course File Audit Checklist.pdf', 'Verified and signed by departmental Academic Audit Committee.', now, now);

    // 8. Publications: 2 Scopus papers -> 30 marks (Approved)
    insertSub.run(23, 8, 1, '1 Scopus/year', '2', JSON.stringify({ publications: [{ title: 'Deep Learning for Edge IoT Networks', journal: 'IEEE Sensors Letters (Scopus)', doi: '10.1109/LENG.2026.1234567' }, { title: 'Adaptive Resource Allocation in 6G Edge', journal: 'Springer Computing (WoS)', doi: '10.1007/s00607-026-0123' }] }), 30, 30, 30, 'APPROVED', 'https://ctgroup.in/evidence/cse/ieee-paper-acceptance.pdf', 'Scopus Publication Certificates.pdf', 'Two indexed first-author research articles published in 2026.', now, now);

    // Initial audit log
    database.prepare(`
      INSERT INTO audit_logs (user_id, action, record_type, record_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(20, 'SYSTEM_INITIALIZATION', 'SYSTEM', '1', JSON.stringify({ status: 'Database seeded with CT Group 1,000-mark framework' }), now);
  }
}
