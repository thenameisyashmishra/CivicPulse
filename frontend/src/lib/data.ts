/*
 * CivicPulse — API-connected data layer
 *
 * Previously this file contained static mock arrays.
 * Now every function calls the real FastAPI backend.
 * The exact same types are exported so pages need minimal changes.
 *
 * Auth: JWT is stored in localStorage under "cp_token".
 *       Login via login() before calling any data function.
 */

// ─── Types (unchanged — pages depend on these exact shapes) ─────────────────

export type ProjectStatus = "active" | "completed" | "delayed" | "flagged";
export type VerificationStatus = "verified" | "pending" | "failed" | "review";

export interface Project {
  id: string;
  name: string;
  type: string;
  location: string;
  contractor: string;
  budget: number;
  spent: number;
  progress: number;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  lastUpdate: string;
  imageCount: number;
  verifiedCount: number;
  lat: number;
  lng: number;
}

export interface Verification {
  id: string;
  rawId: number; // For review/vote requests
  projectId: string;
  projectName: string;
  date: string;
  status: VerificationStatus;
  confidence: number;
  findings: string[];
  imageUrl: string;
  aiAnalysis: string;
  approvalSteps?: any[];
  voteSummary?: Record<string, number>;
}

export interface BudgetData {
  month: string;
  allocated: number;
  spent: number;
}

// ─── Utility functions (unchanged) ──────────────────────────────────────────

export const statusColors: Record<ProjectStatus, string> = {
  active: "#00D4FF",
  completed: "#00E676",
  delayed: "#FFB347",
  flagged: "#FF4757",
};

export const verificationColors: Record<VerificationStatus, string> = {
  verified: "#00E676",
  pending: "#00D4FF",
  failed: "#FF4757",
  review: "#FFB347",
};

export function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

const TOKEN_KEY = "cp_token";
const USER_KEY = "cp_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSavedUser(): { name: string; email: string; role: string; aadhaar_verified: boolean; aadhaar_last_4: string | null } | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function authHeader(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─── Base fetch wrapper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    // Token expired or invalid → clear and redirect
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  user: { id: number; name: string; email: string; role: string; aadhaar_verified: boolean; aadhaar_last_4: string | null; created_at: string };
  token: string;
}

/**
 * Login with email + password. Returns user info and saves the JWT.
 * The backend uses OAuth2 form encoding (not JSON).
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const form = new URLSearchParams();
  form.set("username", email); // OAuth2 field name is "username"
  form.set("password", password);

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "Login failed");
    throw new Error(detail);
  }

  const data = await res.json();
  setToken(data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return { user: data.user, token: data.access_token };
}

// ─── Projects ────────────────────────────────────────────────────────────────

/** Raw shape returned by GET /api/projects */
interface ApiProject {
  id: string;
  name: string;
  type: string;
  location: string;
  contractor: string;
  budget: number;
  spent: number;
  progress: number;
  status: string;
  start_date: string;
  end_date: string;
  lat: number;
  lng: number;
  image_count: number;
  verified_count: number;
}

function mapProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    location: p.location,
    contractor: p.contractor,
    budget: p.budget,
    spent: p.spent,
    progress: p.progress,
    status: p.status as ProjectStatus,
    startDate: p.start_date,
    endDate: p.end_date,
    lastUpdate: p.end_date, // API has no lastUpdate; use endDate as proxy
    imageCount: p.image_count,
    verifiedCount: p.verified_count,
    lat: p.lat,
    lng: p.lng,
  };
}

/** Fetch all projects from the API. */
export async function fetchProjects(): Promise<Project[]> {
  const raw = await apiFetch<ApiProject[]>("/api/projects");
  return raw.map(mapProject);
}

// ─── Verifications (Evidence) ─────────────────────────────────────────────────

/** Raw shape returned by GET /api/evidence */
interface ApiEvidence {
  id: number;
  project_id: string;
  status: string;
  ai_confidence: number | null;
  ai_findings: string[];
  ai_analysis: string | null;
  is_duplicate: boolean;
  within_geofence: boolean | null;
  image_path: string;
  caption: string | null;
  created_at: string;
  approval_steps?: any[];
  vote_summary?: Record<string, number>;
}

function mapVerification(e: ApiEvidence, projectMap: Record<string, string>): Verification {
  return {
    id: `VR-${e.id.toString().padStart(3, "0")}`,
    rawId: e.id,
    projectId: e.project_id,
    projectName: projectMap[e.project_id] || e.project_id,
    date: e.created_at.split("T")[0],
    status: e.status as VerificationStatus,
    // API returns 0-1 float; pages expect 0-100 integer
    confidence: e.ai_confidence != null ? Math.round(e.ai_confidence * 100) : 0,
    findings: Array.isArray(e.ai_findings) ? e.ai_findings : [],
    imageUrl: e.image_path || "",
    aiAnalysis: e.ai_analysis || "Analysis pending.",
    approvalSteps: e.approval_steps || [],
    voteSummary: e.vote_summary || {},
  };
}

/**
 * Fetch all evidence records, mapped to the Verification shape pages expect.
 * Optionally pass a pre-fetched project map to avoid an extra network call.
 */
export async function fetchVerifications(
  projectMap?: Record<string, string>
): Promise<Verification[]> {
  const [evidenceList, pMap] = await Promise.all([
    apiFetch<ApiEvidence[]>("/api/evidence"),
    projectMap
      ? Promise.resolve(projectMap)
      : apiFetch<ApiProject[]>("/api/projects").then((ps) =>
          Object.fromEntries(ps.map((p) => [p.id, p.name]))
        ),
  ]);
  return evidenceList.map((e) => mapVerification(e, pMap));
}

// ─── Budget Timeline (from /api/reports/budget-summary) ─────────────────────

/** Raw shape returned by GET /api/reports/budget-summary */
interface ApiBudgetRow {
  project_id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  utilization_pct: number;
  status: string;
}

/**
 * Fetch budget data from the API.
 * The backend returns per-project rows; we map them to the BudgetData shape
 * used by the existing Recharts bar/line charts (allocated + spent in Crores).
 */
export async function fetchBudgetTimeline(): Promise<BudgetData[]> {
  const rows = await apiFetch<ApiBudgetRow[]>("/api/reports/budget-summary");
  return rows.map((r) => ({
    // Use abbreviated project ID as the "month" label on the chart x-axis
    month: r.project_id.replace("PW-2024-", "PW-"),
    allocated: Math.round(r.allocated / 10_000_000), // rupees → Crores
    spent: Math.round(r.spent / 10_000_000),
  }));
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  active_projects: number;
  completed_projects: number;
  total_projects: number;
  budget_allocated: number;
  budget_spent: number;
  budget_utilization_pct: number;
  verifications_total: number;
  verifications_verified: number;
  verifications_failed: number;
  average_progress: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/dashboard/stats");
}

// ─── CSV export (direct link — browser downloads it) ─────────────────────────

export function budgetCsvUrl(): string {
  return `/api/reports/budget-summary.csv`;
}

// ─── Evidence Upload, Voting & Reviews ───────────────────────────────────────

/** Upload a new verification photo/evidence */
export async function uploadEvidence(
  projectId: string,
  file: File,
  caption?: string
): Promise<Verification> {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) {
    formData.append("caption", caption);
  }

  const token = getToken();
  const res = await fetch(`/api/projects/${projectId}/evidence`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `HTTP ${res.status}`);
  }

  const rawEvidence = await res.json() as ApiEvidence;
  // Get projects map to set project name correctly
  const projects = await apiFetch<ApiProject[]>("/api/projects");
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  return mapVerification(rawEvidence, projectMap);
}

/** Cast a citizen vote */
export async function castVote(
  evidenceId: number,
  choice: "completed" | "incomplete",
  comment?: string
): Promise<any> {
  return apiFetch<any>(`/api/evidence/${evidenceId}/vote`, {
    method: "POST",
    body: JSON.stringify({ choice, comment }),
  });
}

/** Submit an official review decision */
export async function submitReview(
  evidenceId: number,
  decision: "approved" | "rejected" | "escalated",
  remarks?: string
): Promise<any> {
  return apiFetch<any>(`/api/evidence/${evidenceId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, remarks }),
  });
}

/** Simulate Aadhaar verification via DigiLocker */
export async function verifyAadhaar(
  aadhaarNumber: string,
  otpCode: string
): Promise<{ id: number; name: string; email: string; role: string; aadhaar_verified: boolean; aadhaar_last_4: string | null; created_at: string }> {
  const updatedUser = await apiFetch<any>("/api/auth/digilocker/verify", {
    method: "POST",
    body: JSON.stringify({ aadhaar_number: aadhaarNumber, otp_code: otpCode }),
  });
  
  // Update saved user session
  localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  return updatedUser;
}

/** Change current user password */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<any> {
  return apiFetch<any>("/api/auth/profile/password", {
    method: "PUT",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

/** Request password reset simulated email MFA code */
export async function requestPasswordReset(email: string): Promise<{ message: string; simulated_mfa_code: string }> {
  return apiFetch<any>("/api/auth/reset-password/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Verify password reset code and update password */
export async function verifyPasswordReset(
  email: string,
  mfaCode: string,
  newPassword: string
): Promise<any> {
  return apiFetch<any>("/api/auth/reset-password/verify", {
    method: "POST",
    body: JSON.stringify({
      email,
      mfa_code: mfaCode,
      new_password: newPassword,
    }),
  });
}
