// ─── Enums (mirror app/models.py) ───────────────────────────────────────────

export type UserRole = 'citizen' | 'pradhan' | 'engineer' | 'admin'
export type ProjectStatus = 'active' | 'completed' | 'delayed' | 'flagged'
export type EvidenceStatus = 'pending' | 'review' | 'verified' | 'failed'
export type VoteChoice = 'completed' | 'incomplete' | 'partial'
export type ApprovalLevel = 'pradhan' | 'engineer' | 'admin'
export type ApprovalDecision = 'pending' | 'approved' | 'rejected' | 'escalated'

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface UserOut {
  id: number
  name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
  user: UserOut
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface ProjectOut {
  id: string
  name: string
  type: string
  location: string
  contractor: string
  budget: number
  spent: number
  progress: number
  status: ProjectStatus
  start_date: string
  end_date: string
  lat: number
  lng: number
  image_count: number
  verified_count: number
}

export interface ProjectCreate {
  id: string
  name: string
  type: string
  location: string
  contractor: string
  budget: number
  spent?: number
  progress?: number
  status?: ProjectStatus
  start_date: string
  end_date: string
  lat: number
  lng: number
}

export interface ProjectUpdate {
  name?: string
  type?: string
  location?: string
  contractor?: string
  budget?: number
  spent?: number
  progress?: number
  status?: ProjectStatus
  end_date?: string
}

// ─── Approval ────────────────────────────────────────────────────────────────

export interface ApprovalStepOut {
  id: number
  level: ApprovalLevel
  decision: ApprovalDecision
  reviewer_id: number | null
  remarks: string | null
  decided_at: string | null
  created_at: string
}

// ─── Evidence ────────────────────────────────────────────────────────────────

export interface EvidenceOut {
  id: number
  project_id: string
  uploaded_by_id: number
  image_path: string
  caption: string | null
  gps_lat: number | null
  gps_lng: number | null
  captured_at: string | null
  distance_from_site_m: number | null
  within_geofence: boolean | null
  phash: string | null
  is_duplicate: boolean
  duplicate_of_id: number | null
  quality_score: number | null
  completion_estimate: number | null
  ai_confidence: number | null
  ai_status: EvidenceStatus
  ai_findings: string[]
  ai_analysis: string | null
  status: EvidenceStatus
  created_at: string
  approval_steps: ApprovalStepOut[]
  vote_summary: Record<string, number>
}

export interface EvidenceListItem {
  id: number
  project_id: string
  status: EvidenceStatus
  ai_confidence: number | null
  is_duplicate: boolean
  within_geofence: boolean | null
  created_at: string
}

// ─── Votes ───────────────────────────────────────────────────────────────────

export interface VoteCreate {
  choice: VoteChoice
  comment?: string
}

export interface VoteOut {
  id: number
  evidence_id: number
  citizen_id: number
  choice: VoteChoice
  comment: string | null
  created_at: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  active_projects: number
  completed_projects: number
  total_projects: number
  budget_allocated: number
  budget_spent: number
  budget_utilization_pct: number
  verifications_total: number
  verifications_verified: number
  verifications_failed: number
  average_progress: number
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface BudgetSummaryRow {
  project_id: string
  name: string
  allocated: number
  spent: number
  remaining: number
  utilization_pct: number
  status: ProjectStatus
}

export interface VerificationOutcomeCounts {
  verified: number
  pending: number
  failed: number
  review: number
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export interface MapPoint {
  id: string
  name: string
  status: ProjectStatus
  lat: number
  lng: number
}
