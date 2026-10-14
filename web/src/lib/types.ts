export type UserRole = 'ADMIN' | 'FACULTY';
export type UserStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type SubmissionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'RESUBMITTED';

export interface User {
  id: number;
  name: string;
  college_id: string; // e.g. "20", "CT-FAC-101"
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  department_id: number | null;
  department_name?: string;
  designation: string;
  status: UserStatus;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface AcademicSession {
  id: number;
  name: string; // e.g. "2026-2027"
  is_active: number;
  start_date: string;
  end_date: string;
  submission_deadline: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  hod_user_id: number | null;
  hod_name?: string;
}

export type ScoringType =
  | 'BINARY'
  | 'SLAB_RESULT_ATTENDANCE'
  | 'SLAB_FEEDBACK'
  | 'PER_UNIT_ADMISSION'
  | 'PUBLICATIONS'
  | 'BOOKS'
  | 'PROJECTS'
  | 'PER_UNIT_PARTICIPATION'
  | 'SLAB_MENTORSHIP_ALUMNI'
  | 'EVENTS'
  | 'CUSTOM';

export interface EvaluationCategory {
  id: number;
  role: UserRole;
  code: string;
  name: string;
  section?: 'DEPT' | 'SELF' | 'INST' | 'FACULTY';
  description: string;
  target_criteria: string;
  max_marks: number;
  scoring_type: ScoringType;
  scoring_rules_json: string;
  order_num: number;
}

export interface FacultySubmission {
  id: number;
  user_id: number;
  category_id: number;
  session_id: number;
  target_input: string;
  achievement_input: string;
  details_json: string;
  calculated_score: number;
  claimed_score: number;
  approved_score: number | null;
  status: SubmissionStatus;
  evidence_url: string | null;
  evidence_name: string | null;
  faculty_remarks: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  category?: EvaluationCategory;
  user?: User;
  reviews?: Review[];
}

export interface Review {
  id: number;
  submission_id: number;
  reviewer_id: number;
  reviewer_name?: string;
  previous_status: SubmissionStatus;
  new_status: SubmissionStatus;
  comments: string;
  approved_score: number;
  reviewed_at: string;
}

export interface SupportingDocument {
  id: number;
  submission_id: number | null;
  user_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name?: string;
  action: string;
  record_type: string;
  record_id: string;
  details_json: string;
  ip_address: string | null;
  created_at: string;
}

export interface HodEvaluation {
  id: number;
  hod_id: number;
  department_id: number;
  session_id: number;
  dept_score: number;
  self_score: number;
  total_score: number;
  status: SubmissionStatus;
  admin_remarks: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export interface HoiEvaluation {
  id: number;
  hoi_id: number;
  session_id: number;
  inst_score: number;
  self_score: number;
  total_score: number;
  status: SubmissionStatus;
  authority_remarks: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}
