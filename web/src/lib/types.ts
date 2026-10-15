export type UserRole = 'ADMIN' | 'HOI' | 'HOD' | 'FACULTY';
export type UserStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type SubmissionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' // Legacy / General
  | 'SUBMITTED_TO_HOD' // Tier 1: Faculty submitted -> waiting for HOD verification
  | 'VERIFIED_BY_HOD'  // Tier 2: HOD verified -> forwarded to HOI
  | 'REJECTED_BY_HOD'  // Tier 2: HOD rejected -> sent back to faculty for correction
  | 'VERIFIED_BY_HOI'  // Tier 3: HOI verified -> forwarded to Director
  | 'REJECTED_BY_HOI'  // Tier 3: HOI rejected -> sent back
  | 'APPROVED'         // Tier 4: Director Final Institutional Approval
  | 'REJECTED'         // Tier 4: Director Rejected
  | 'RESUBMITTED'
  | 'UNDER_REVIEW';

export interface User {
  id: number;
  name: string;
  college_id: string; // e.g. "20", "CT-FAC-101", "HOD_CSE"
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

  // Multi-tier verification trail
  hod_score?: number | null;
  hod_remarks?: string | null;
  hod_reviewed_at?: string | null;
  hod_reviewer_id?: number | null;

  hoi_score?: number | null;
  hoi_remarks?: string | null;
  hoi_reviewed_at?: string | null;
  hoi_reviewer_id?: number | null;

  director_score?: number | null;
  director_remarks?: string | null;
  director_reviewed_at?: string | null;
  director_reviewer_id?: number | null;

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
  reviewer_role?: UserRole;
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
  details_json?: string;
  evidence_url?: string | null;
  evidence_name?: string | null;
  hod_remarks?: string | null;
  hoi_remarks?: string | null;
  hoi_score?: number | null;
  hoi_reviewed_at?: string | null;
  director_remarks?: string | null;
  director_reviewed_at?: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;

  // Joined fields
  hod_name?: string;
  department_name?: string;
}

export interface HoiEvaluation {
  id: number;
  hoi_id: number;
  session_id: number;
  inst_score: number;
  self_score: number;
  total_score: number;
  status: SubmissionStatus;
  details_json?: string;
  evidence_url?: string | null;
  evidence_name?: string | null;
  hoi_remarks?: string | null;
  director_remarks?: string | null;
  director_reviewed_at?: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;

  // Joined fields
  hoi_name?: string;
}

export interface GoogleDbConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseUrl?: string;
  isConfigured: boolean;
}

export interface GoogleDbStatus {
  connected: boolean;
  projectId: string;
  syncedCollections: string[];
  totalRecords: number;
  lastSyncTime: string | null;
  mode: 'LIVE_GOOGLE_FIRESTORE' | 'EMBEDDED_LOCAL_DB';
  message: string;
}
