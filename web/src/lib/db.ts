import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

// Resolve database path in the project directory or persistent volume
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'ctgroup_kpi.db');
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
  // 1. Users table (ADMIN, HOI, HOD, FACULTY)
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      college_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'FACULTY' CHECK(role IN ('ADMIN', 'HOI', 'HOD', 'FACULTY')),
      department_id INTEGER,
      designation TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK(status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
      avatar TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure role column check constraint supports HOD & HOI on existing tables
  try {
    const userCols = database.prepare("PRAGMA table_info(users)").all() as any[];
    const hasPhone = userCols.some((c) => c.name === 'phone');
    if (!hasPhone) {
      database.exec("ALTER TABLE users ADD COLUMN phone TEXT;");
    }
  } catch (e) {
    // Ignore migration catch
  }

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

  // 4. Evaluation Categories (Faculty, HOD, HOI)
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

  // 5. Faculty Submissions (with 4-Tier Verification trail)
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
      status TEXT NOT NULL DEFAULT 'DRAFT',
      evidence_url TEXT,
      evidence_name TEXT,
      faculty_remarks TEXT,
      
      -- Tier 2: HOD Verification
      hod_score REAL,
      hod_remarks TEXT,
      hod_reviewed_at TEXT,
      hod_reviewer_id INTEGER REFERENCES users(id),

      -- Tier 3: HOI Verification
      hoi_score REAL,
      hoi_remarks TEXT,
      hoi_reviewed_at TEXT,
      hoi_reviewer_id INTEGER REFERENCES users(id),

      -- Tier 4: Director Final Approval
      director_score REAL,
      director_remarks TEXT,
      director_reviewed_at TEXT,
      director_reviewer_id INTEGER REFERENCES users(id),

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, category_id, session_id)
    );
  `);

  // Auto-migrate any missing columns on existing faculty_submissions table
  try {
    const fsCols = database.prepare("PRAGMA table_info(faculty_submissions)").all() as any[];
    const colNames = fsCols.map(c => c.name);
    if (!colNames.includes('hod_score')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN hod_score REAL;");
    if (!colNames.includes('hod_remarks')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN hod_remarks TEXT;");
    if (!colNames.includes('hod_reviewed_at')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN hod_reviewed_at TEXT;");
    if (!colNames.includes('hod_reviewer_id')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN hod_reviewer_id INTEGER;");
    if (!colNames.includes('hoi_score')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN hoi_score REAL;");
    if (!colNames.includes('hoi_remarks')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN hoi_remarks TEXT;");
    if (!colNames.includes('hoi_reviewed_at')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN hoi_reviewed_at TEXT;");
    if (!colNames.includes('hoi_reviewer_id')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN hoi_reviewer_id INTEGER;");
    if (!colNames.includes('director_score')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN director_score REAL;");
    if (!colNames.includes('director_remarks')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN director_remarks TEXT;");
    if (!colNames.includes('director_reviewed_at')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN director_reviewed_at TEXT;");
    if (!colNames.includes('director_reviewer_id')) database.exec("ALTER TABLE faculty_submissions ADD COLUMN director_reviewer_id INTEGER;");
  } catch (e) {
    // Migration handled
  }

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

  // 7. Reviews (Full audit of verification steps)
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

  // 8. HOD Evaluations Table
  database.exec(`
    CREATE TABLE IF NOT EXISTS hod_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hod_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      department_id INTEGER NOT NULL REFERENCES departments(id),
      session_id INTEGER NOT NULL REFERENCES academic_sessions(id),
      dept_score REAL NOT NULL DEFAULT 0,
      self_score REAL NOT NULL DEFAULT 0,
      total_score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      details_json TEXT DEFAULT '{}',
      evidence_url TEXT,
      evidence_name TEXT,
      hod_remarks TEXT,
      hoi_remarks TEXT,
      hoi_score REAL,
      hoi_reviewed_at TEXT,
      director_remarks TEXT,
      director_reviewed_at TEXT,
      submitted_at TEXT,
      reviewed_at TEXT,
      UNIQUE(hod_id, session_id)
    );
  `);

  // 9. HOI Evaluations Table
  database.exec(`
    CREATE TABLE IF NOT EXISTS hoi_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hoi_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES academic_sessions(id),
      inst_score REAL NOT NULL DEFAULT 0,
      self_score REAL NOT NULL DEFAULT 0,
      total_score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      details_json TEXT DEFAULT '{}',
      evidence_url TEXT,
      evidence_name TEXT,
      hoi_remarks TEXT,
      director_remarks TEXT,
      director_reviewed_at TEXT,
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

  // 11. Google Database Sync State Table
  database.exec(`
    CREATE TABLE IF NOT EXISTS google_db_sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed data if empty
  seedInitialData(database);
}

function seedInitialData(database: Database.Database) {
  const now = new Date().toISOString();

  // 1. Seed Active Academic Session
  const sessionCount = database.prepare('SELECT count(*) as count FROM academic_sessions').get() as { count: number };
  if (sessionCount.count === 0) {
    database.prepare(`
      INSERT INTO academic_sessions (name, is_active, start_date, end_date, submission_deadline)
      VALUES (?, ?, ?, ?, ?)
    `).run('2026-2027', 1, '2026-07-01', '2027-06-30', '2026-12-31');
  }

  // 2. Seed Academic Departments (CT Group Institutes)
  const ctInstitutes = [
    { code: 'CTIEMT', name: 'CT Institute of Engineering, Management & Technology' },
    { code: 'CTIT', name: 'CT Institute of Technology' },
    { code: 'CTIMT', name: 'CT Institute of Management & Technology' },
    { code: 'CTIHM', name: 'CT Institute of Hotel Management' },
    { code: 'CTIHS', name: 'CT Institute of Higher Studies' },
    { code: 'CTPC', name: 'CT Polytechnic College' },
    { code: 'CTCP', name: 'CT College of Pharmacy' },
    { code: 'CTIPS', name: 'CT Institute of Pharmaceutical Sciences' },
    { code: 'CTIL', name: 'CT Institute of Law' },
  ];

  const insertDept = database.prepare('INSERT OR IGNORE INTO departments (id, name, code) VALUES (?, ?, ?)');
  ctInstitutes.forEach((inst, index) => {
    insertDept.run(index + 1, inst.name, inst.code);
  });

  // 3. Seed Default Clean Accounts for All 4 Roles
  const insertUser = database.prepare(`
    INSERT OR IGNORE INTO users 
    (id, name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // A. Director / Admin
  const adminPasswordHash = bcrypt.hashSync('CTAdmin@2026', 10);
  insertUser.run(
    20,
    'Institutional Director / Administrator',
    '20',
    'developer@ctgroup.in',
    '+91 98765 43210',
    adminPasswordHash,
    'ADMIN',
    null,
    'Director / System Admin',
    'APPROVED',
    now,
    now
  );

  // B. Head of Institution (HOI)
  const defaultPassHash = bcrypt.hashSync('Password@123', 10);
  insertUser.run(
    21,
    'Dr. Gurpreet Singh (HOI / Director Academics)',
    'HOI01',
    'hoi@ctgroup.in',
    '+91 98765 00001',
    defaultPassHash,
    'HOI',
    null,
    'Head of Institution / Director Academics',
    'APPROVED',
    now,
    now
  );

  // C. Head of Departments for each of the 9 CT Group Institutes
  ctInstitutes.forEach((inst, index) => {
    const hodId = 30 + index;
    const hodCollegeId = `HOD_${inst.code}`;
    const hodEmail = `hod.${inst.code.toLowerCase()}@ctgroup.in`;
    const hodName = index === 0 ? 'Prof. Harjit Verma (HOD CTIEMT)' : `HOD ${inst.code}`;

    insertUser.run(
      hodId,
      hodName,
      hodCollegeId,
      hodEmail,
      '+91 98765 00002',
      defaultPassHash,
      'HOD',
      index + 1,
      `Head of Department (${inst.code})`,
      'APPROVED',
      now,
      now
    );

    database.prepare('UPDATE departments SET hod_user_id = ? WHERE id = ?').run(hodId, index + 1);
  });

  // D. Faculty (CTIEMT)
  insertUser.run(
    23,
    'Er. Suman Krishna (Faculty)',
    '2301275',
    'suman.krishna@ctgroup.in',
    '+91 98765 00003',
    defaultPassHash,
    'FACULTY',
    1, // CTIEMT
    'Assistant Professor (CTIEMT)',
    'APPROVED',
    now,
    now
  );

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

  // 5. Seed HOD Categories (1,000 Marks: DEPT = 400 Marks, SELF = 600 Marks)
  const hodCatCount = database.prepare("SELECT count(*) as count FROM evaluation_categories WHERE role = 'HOD'").get() as { count: number };
  if (hodCatCount.count === 0) {
    const insertCat = database.prepare(`
      INSERT INTO evaluation_categories 
      (role, code, name, section, description, target_criteria, max_marks, scoring_type, scoring_rules_json, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const hodCategories = [
      {
        role: 'HOD',
        code: 'HOD_DEPT_RESULTS',
        name: 'Departmental Pass Percentage & Academic Outcome',
        section: 'DEPT',
        description: 'Overall pass percentage across all semesters and subjects within the department.',
        target_criteria: 'Target: >85% overall department university pass rate',
        max_marks: 120,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 1,
      },
      {
        role: 'HOD',
        code: 'HOD_DEPT_ADMISSIONS',
        name: 'Department Admissions & Enrollment Ratio',
        section: 'DEPT',
        description: 'Achieved student enrollment against approved intake capacity for department programs.',
        target_criteria: 'Target: >= 90% seat occupancy',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 2,
      },
      {
        role: 'HOD',
        code: 'HOD_DEPT_RESEARCH',
        name: 'Department Research Publications & Sponsored Grants',
        section: 'DEPT',
        description: 'Cumulative Scopus/WoS publications and funded projects submitted by department faculty.',
        target_criteria: 'Min. 1.5 indexed publications per faculty member/year',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 3,
      },
      {
        role: 'HOD',
        code: 'HOD_DEPT_PLACEMENTS',
        name: 'Student Placements & Industry Internships',
        section: 'DEPT',
        description: 'Percentage of eligible graduating students successfully placed in core & IT industries.',
        target_criteria: 'Min. 80% placement of eligible graduates',
        max_marks: 80,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 4,
      },
      {
        role: 'HOD',
        code: 'HOD_SELF_CURRICULUM',
        name: 'Academic Planning, Syllabus Coverage & Lab Audits',
        section: 'SELF',
        description: 'Effective implementation of academic calendar, weekly syllabus delivery checks, and laboratory readiness.',
        target_criteria: '100% compliance verified in bi-weekly academic audits',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 5,
      },
      {
        role: 'HOD',
        code: 'HOD_SELF_FACULTY_DEV',
        name: 'Faculty Appraisal & Mentorship Governance',
        section: 'SELF',
        description: 'Monitoring faculty lesson plans, performance mentoring, and timely KRA/KPI verification.',
        target_criteria: '100% faculty appraisals verified and submitted within deadlines',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 6,
      },
      {
        role: 'HOD',
        code: 'HOD_SELF_EVENTS',
        name: 'Technical Symposiums, Hackathons & Industry MoUs',
        section: 'SELF',
        description: 'Organizing national-level conferences, student hackathons, and corporate MoUs with active internships.',
        target_criteria: 'Min. 2 departmental technical events and 1 industrial MoU/year',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 7,
      },
      {
        role: 'HOD',
        code: 'HOD_SELF_ACCREDITATION',
        name: 'NAAC / NBA Accreditation Portfolio & Institutional Duties',
        section: 'SELF',
        description: 'Criterion documentation for NBA/NAAC, departmental IQAC files, and committee assignments.',
        target_criteria: '100% audit compliance with zero non-conformances',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 8,
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
  }

  // 6. Seed HOI Categories (1,000 Marks: INST = 500 Marks, SELF = 500 Marks)
  const hoiCatCount = database.prepare("SELECT count(*) as count FROM evaluation_categories WHERE role = 'HOI'").get() as { count: number };
  if (hoiCatCount.count === 0) {
    const insertCat = database.prepare(`
      INSERT INTO evaluation_categories 
      (role, code, name, section, description, target_criteria, max_marks, scoring_type, scoring_rules_json, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const hoiCategories = [
      {
        role: 'HOI',
        code: 'HOI_INST_ACCREDITATION',
        name: 'Institutional Accreditation (NAAC / NBA / NIRF Ranking)',
        section: 'INST',
        description: 'Institution-wide readiness, self-study report submissions, and grade achievements.',
        target_criteria: 'Target: A+ grade accreditation & NIRF ranking bracket',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 1,
      },
      {
        role: 'HOI',
        code: 'HOI_INST_ADMISSIONS',
        name: 'Campus Admissions Yield & Retention Rate',
        section: 'INST',
        description: 'Total campus new student admissions against aggregate approved intake across all institutes.',
        target_criteria: 'Target: >= 92% overall intake yield',
        max_marks: 130,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 2,
      },
      {
        role: 'HOI',
        code: 'HOI_INST_PLACEMENTS',
        name: 'Campus Placements & Average Salary Package',
        section: 'INST',
        description: 'Campus-wide placement percentage and average CTC secured by graduating cohort.',
        target_criteria: 'Target: >= 85% eligible placements with average CTC >= 4.5 LPA',
        max_marks: 120,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 3,
      },
      {
        role: 'HOI',
        code: 'HOI_INST_RESEARCH_ENDOWMENT',
        name: 'Institutional Research Grants, Patents & Consultancy',
        section: 'INST',
        description: 'Externally sanctioned research funding from central agencies and industrial consultancies.',
        target_criteria: 'Target: >= 50 Lakhs external research & consultancy revenue',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 4,
      },
      {
        role: 'HOI',
        code: 'HOI_SELF_GOVERNANCE',
        name: 'Institutional Strategic Leadership & Academic Governance',
        section: 'SELF',
        description: 'Supervision of Heads of Departments, execution of strategic 5-year vision, and statutory council meetings.',
        target_criteria: '100% compliance with AICTE/UGC/University guidelines',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 5,
      },
      {
        role: 'HOI',
        code: 'HOI_SELF_INDUSTRY_COLLAB',
        name: 'Corporate MoUs, Centers of Excellence & Global Tie-ups',
        section: 'SELF',
        description: 'Establishing active Centers of Excellence (CoE), international exchange programs, and industry partnerships.',
        target_criteria: 'Min. 3 active industry CoEs established/operational',
        max_marks: 150,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 6,
      },
      {
        role: 'HOI',
        code: 'HOI_SELF_FINANCIAL_DISCIPLINE',
        name: 'Budget Planning, Infrastructure Development & Financial Health',
        section: 'SELF',
        description: 'Optimal utilization of annual institutional capital budget, lab modernization, and green campus initiatives.',
        target_criteria: '100% on-time budget execution within allocated limits',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 7,
      },
      {
        role: 'HOI',
        code: 'HOI_SELF_STUDENT_WELFARE',
        name: 'Student Satisfaction, Anti-Ragging & Campus Culture',
        section: 'SELF',
        description: 'Zero anti-ragging incidents, student grievance redressal efficiency, and extracurricular championships.',
        target_criteria: '100% grievance disposal within 7 working days',
        max_marks: 100,
        scoring_type: 'CUSTOM',
        scoring_rules_json: '{}',
        order_num: 8,
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
}
