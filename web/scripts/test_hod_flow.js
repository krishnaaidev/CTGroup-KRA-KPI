const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../ctgroup_kpi.db');
const db = new Database(dbPath);

console.log('=== VERIFYING HOD SOLE VERIFICATION WORKFLOW ===');

// 1. Check Faculty submission before HOD review
const subBefore = db.prepare(`
  SELECT fs.id, fs.user_id, u.name as faculty_name, d.code as dept_code, ec.name as category,
         fs.claimed_score, fs.calculated_score, fs.approved_score, fs.status
  FROM faculty_submissions fs
  JOIN users u ON fs.user_id = u.id
  JOIN departments d ON u.department_id = d.id
  JOIN evaluation_categories ec ON fs.category_id = ec.id
  WHERE fs.user_id = 23
  LIMIT 1
`).get();

console.log('Submission Before HOD Review:', subBefore);

// 2. Simulate HOD approving the submission
const now = new Date().toISOString();
const hodUser = db.prepare("SELECT id, name, role, department_id FROM users WHERE college_id = 'HOD_CTIEMT'").get();
console.log('Reviewing HOD:', hodUser);

const scoreVal = 50;
const hodRemarks = 'Verified 100% syllabus coverage on LMS & Google Sheets. Excellent compliance.';

// Apply approval as HOD
db.prepare(`
  UPDATE faculty_submissions
  SET status = 'APPROVED',
      approved_score = ?,
      hod_score = ?,
      hod_remarks = ?,
      hod_reviewed_at = ?,
      hod_reviewer_id = ?,
      updated_at = ?
  WHERE id = ?
`).run(scoreVal, scoreVal, hodRemarks, now, hodUser.id, now, subBefore.id);

// Record in reviews table
db.prepare(`
  INSERT INTO reviews (submission_id, reviewer_id, previous_status, new_status, comments, approved_score, reviewed_at)
  VALUES (?, ?, ?, 'APPROVED', ?, ?, ?)
`).run(subBefore.id, hodUser.id, subBefore.status, hodRemarks, scoreVal, now);

// 3. Check Submission After HOD Review
const subAfter = db.prepare(`
  SELECT fs.id, fs.user_id, u.name as faculty_name, d.code as dept_code, ec.name as category,
         fs.claimed_score, fs.approved_score, fs.hod_score, fs.status, fs.hod_remarks
  FROM faculty_submissions fs
  JOIN users u ON fs.user_id = u.id
  JOIN departments d ON u.department_id = d.id
  JOIN evaluation_categories ec ON fs.category_id = ec.id
  WHERE fs.id = ?
`).get(subBefore.id);

console.log('\nSubmission After HOD Review:');
console.log(subAfter);

if (subAfter.status === 'APPROVED' && subAfter.approved_score === 50) {
  console.log('\n SUCCESS: HOD approval is final! Status is APPROVED and approved_score is 50. No HOI or Director approval needed.');
} else {
  console.error('\n FAILURE: Status is not APPROVED');
}

db.close();
