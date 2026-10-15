const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../ctgroup_kpi.db');
const db = new Database(dbPath);

console.log('--- Migrating CT Group 9 Institutes & HOD Hierarchy ---');

// The exact 9 CT Group Institutes
const ctInstitutes = [
  { id: 1, code: 'CTIEMT', name: 'CT Institute of Engineering, Management & Technology' },
  { id: 2, code: 'CTIT', name: 'CT Institute of Technology' },
  { id: 3, code: 'CTIMT', name: 'CT Institute of Management & Technology' },
  { id: 4, code: 'CTIHM', name: 'CT Institute of Hotel Management' },
  { id: 5, code: 'CTIHS', name: 'CT Institute of Higher Studies' },
  { id: 6, code: 'CTPC', name: 'CT Polytechnic College' },
  { id: 7, code: 'CTCP', name: 'CT College of Pharmacy' },
  { id: 8, code: 'CTIPS', name: 'CT Institute of Pharmaceutical Sciences' },
  { id: 9, code: 'CTIL', name: 'CT Institute of Law' },
];

// Disable foreign keys temporarily during table reset
db.pragma('foreign_keys = OFF');
db.exec('DELETE FROM departments');
const insertDept = db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)');
for (const inst of ctInstitutes) {
  insertDept.run(inst.id, inst.name, inst.code);
}
console.log('Seeded 9 CT Group Institutes successfully.');

const now = new Date().toISOString();
const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);
const adminPasswordHash = bcrypt.hashSync('CTAdmin@2026', 10);

// Ensure Director Admin exists
db.prepare(`
  INSERT INTO users (id, name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
  VALUES (20, 'Institutional Director / Administrator', '20', 'developer@ctgroup.in', '+91 98765 43210', ?, 'ADMIN', NULL, 'Director / System Admin', 'APPROVED', ?, ?)
  ON CONFLICT(id) DO UPDATE SET 
    name = excluded.name, 
    college_id = excluded.college_id, 
    email = excluded.email, 
    role = excluded.role, 
    password_hash = excluded.password_hash,
    status = 'APPROVED'
`).run(adminPasswordHash, now, now);

// Ensure Head of Institution (HOI) exists
db.prepare(`
  INSERT INTO users (id, name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
  VALUES (21, 'Dr. Gurpreet Singh (HOI / Director Academics)', 'HOI01', 'hoi@ctgroup.in', '+91 98765 00001', ?, 'HOI', NULL, 'Head of Institution / Director Academics', 'APPROVED', ?, ?)
  ON CONFLICT(id) DO UPDATE SET 
    name = excluded.name, 
    college_id = excluded.college_id, 
    email = excluded.email, 
    role = excluded.role, 
    password_hash = excluded.password_hash,
    status = 'APPROVED'
`).run(defaultPasswordHash, now, now);

// Seed 9 HODs (one for each institute)
const hodInsert = db.prepare(`
  INSERT INTO users (id, name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, 'HOD', ?, ?, 'APPROVED', ?, ?)
  ON CONFLICT(id) DO UPDATE SET 
    name = excluded.name, 
    college_id = excluded.college_id, 
    email = excluded.email, 
    role = 'HOD', 
    department_id = excluded.department_id,
    designation = excluded.designation,
    password_hash = excluded.password_hash,
    status = 'APPROVED'
`);

ctInstitutes.forEach((inst, index) => {
  const hodId = 30 + index; // 30, 31, 32, ... 38
  const hodCollegeId = `HOD_${inst.code}`;
  const hodEmail = `hod.${inst.code.toLowerCase()}@ctgroup.in`;
  const hodName = index === 0 ? 'Prof. Harjit Verma (HOD CTIEMT)' : `Head of Department (${inst.code})`;
  const hodDesignation = `Head of Department (${inst.code})`;

  hodInsert.run(
    hodId,
    hodName,
    hodCollegeId,
    hodEmail,
    '+91 98765 00002',
    defaultPasswordHash,
    inst.id,
    hodDesignation,
    now,
    now
  );

  db.prepare('UPDATE departments SET hod_user_id = ? WHERE id = ?').run(hodId, inst.id);
});
console.log('Seeded 9 HOD accounts for all 9 institutes.');

// Seed Faculty Er. Suman Krishna in CTIEMT (dept id: 1)
db.prepare(`
  INSERT INTO users (id, name, college_id, email, phone, password_hash, role, department_id, designation, status, created_at, updated_at)
  VALUES (23, 'Er. Suman Krishna (Faculty)', '2301275', 'suman.krishna@ctgroup.in', '+91 98765 00003', ?, 'FACULTY', 1, 'Assistant Professor (CTIEMT)', 'APPROVED', ?, ?)
  ON CONFLICT(id) DO UPDATE SET 
    name = excluded.name, 
    college_id = excluded.college_id, 
    email = excluded.email, 
    role = 'FACULTY', 
    department_id = 1,
    designation = excluded.designation,
    password_hash = excluded.password_hash,
    status = 'APPROVED'
`).run(defaultPasswordHash, now, now);

// Update any other faculty in users to point to CTIEMT or appropriate department
db.prepare('UPDATE users SET department_id = 1 WHERE department_id IS NOT NULL AND department_id > 9').run();

// Clean existing submissions and seed sample submissions for Er. Suman Krishna
const catLesson = db.prepare("SELECT id, max_marks FROM evaluation_categories WHERE code = 'CAT_LESSON_PLAN'").get();
const catResult = db.prepare("SELECT id, max_marks FROM evaluation_categories WHERE code = 'CAT_RESULT'").get();
const catResearch = db.prepare("SELECT id, max_marks FROM evaluation_categories WHERE code = 'CAT_RESEARCH'").get();

if (catLesson) {
  db.prepare(`
    INSERT INTO faculty_submissions (
      user_id, category_id, session_id, target_input, achievement_input, details_json,
      calculated_score, claimed_score, status, evidence_name, evidence_url, faculty_remarks,
      created_at, updated_at
    ) VALUES (
      23, ?, 1, '100% syllabus covered on Google Sheets', '100% covered', '{}',
      50, 50, 'SUBMITTED_TO_HOD', 'CTIEMT_CSE_LessonPlan_2026.pdf', 'https://ctgroup.in/evidence/lesson_plan.pdf',
      'All 14 weeks lecture notes and LMS records updated for CTIEMT semester.', ?, ?
    )
    ON CONFLICT(user_id, category_id, session_id) DO UPDATE SET
      status = 'SUBMITTED_TO_HOD',
      claimed_score = 50,
      calculated_score = 50,
      evidence_name = 'CTIEMT_CSE_LessonPlan_2026.pdf',
      updated_at = excluded.updated_at
  `).run(catLesson.id, now, now);
}

if (catResult) {
  db.prepare(`
    INSERT INTO faculty_submissions (
      user_id, category_id, session_id, target_input, achievement_input, details_json,
      calculated_score, claimed_score, status, evidence_name, evidence_url, faculty_remarks,
      created_at, updated_at
    ) VALUES (
      23, ?, 1, '88% university pass percentage', '88%', '{}',
      120, 120, 'SUBMITTED_TO_HOD', 'PTU_Official_Gazette_Result_2026.pdf', 'https://ctgroup.in/evidence/ptu_result.pdf',
      'Subject pass percentage 88% verified across sections A & B.', ?, ?
    )
    ON CONFLICT(user_id, category_id, session_id) DO UPDATE SET
      status = 'SUBMITTED_TO_HOD',
      claimed_score = 120,
      calculated_score = 120,
      evidence_name = 'PTU_Official_Gazette_Result_2026.pdf',
      updated_at = excluded.updated_at
  `).run(catResult.id, now, now);
}

if (catResearch) {
  db.prepare(`
    INSERT INTO faculty_submissions (
      user_id, category_id, session_id, target_input, achievement_input, details_json,
      calculated_score, claimed_score, status, evidence_name, evidence_url, faculty_remarks,
      created_at, updated_at
    ) VALUES (
      23, ?, 1, '2 Scopus Indexed Journal Papers', '2 papers published', '{}',
      60, 60, 'SUBMITTED_TO_HOD', 'IEEE_Scopus_Publication_Certificate.pdf', 'https://ctgroup.in/evidence/ieee_paper.pdf',
      'Published in IEEE Transactions on Learning Technologies (Scopus Q1).', ?, ?
    )
    ON CONFLICT(user_id, category_id, session_id) DO UPDATE SET
      status = 'SUBMITTED_TO_HOD',
      claimed_score = 60,
      calculated_score = 60,
      evidence_name = 'IEEE_Scopus_Publication_Certificate.pdf',
      updated_at = excluded.updated_at
  `).run(catResearch.id, now, now);
}

console.log('Faculty sample submissions seeded in SUBMITTED_TO_HOD status.');

// Print verified departments and HOD list
const depts = db.prepare(`
  SELECT d.id, d.code, d.name, u.college_id as hod_login_id, u.email as hod_email
  FROM departments d
  LEFT JOIN users u ON d.hod_user_id = u.id
  ORDER BY d.id ASC
`).all();
console.table(depts);

db.pragma('foreign_keys = ON');
db.close();
console.log('Database migration complete!');
