import Database from 'better-sqlite3';
import path from 'path';
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
  // 1. Users table (Strictly ADMIN and FACULTY)
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      college_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'FACULTY' CHECK(role IN ('ADMIN', 'FACULTY')),
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

  // 4. Evaluation Categories (17 Faculty Categories = 1,000 Marks)
  database.exec(`
    CREATE TABLE IF NOT EXISTS evaluation_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL DEFAULT 'FACULTY',
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

  // 5. Faculty Submissions
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

  // 8. Audit Logs
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
  // 1. Seed Active Academic Session
  const sessionCount = database.prepare('SELECT count(*) as count FROM academic_sessions').get() as { count: number };
  if (sessionCount.count === 0) {
    database.prepare(`
      INSERT INTO academic_sessions (name, is_active, start_date, end_date, submission_deadline)
      VALUES (?, ?, ?, ?, ?)
    `).run('2026-2027', 1, '2026-07-01', '2027-06-30', '2026-12-31');
  }

  // 2. Seed Academic Departments
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

  // 3. Seed ONLY the Initial Admin account (No pre-added faculties)
  const adminExists = database.prepare("SELECT id FROM users WHERE role = 'ADMIN'").get();
  if (!adminExists) {
    const now = new Date().toISOString();
    const adminPasswordHash = bcrypt.hashSync('CTAdmin@2026', 10);

    database.prepare(`
      INSERT INTO users (id, name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
  }

  // 4. Seed the 17 Faculty KRA & KPI Categories (Strict 1,000 Marks Framework)
  const catCount = database.prepare("SELECT count(*) as count FROM evaluation_categories WHERE role = 'FACULTY'").get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = database.prepare(`
      INSERT INTO evaluation_categories 
      (role, code, name, section, description, target_criteria, max_marks, scoring_type, scoring_rules_json, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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
  }
}
