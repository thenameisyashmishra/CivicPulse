/*
 * Dashboard — CivicPulse
 * Overview with KPIs, project status grid, budget chart, recent verifications.
 * Data is now loaded from the live API via fetchProjects / fetchVerifications / fetchBudgetTimeline.
 */
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchProjects,
  fetchVerifications,
  fetchBudgetTimeline,
  formatCurrency,
  statusColors,
  verificationColors,
  type Project,
  type Verification,
  type BudgetData,
} from "@/lib/data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: projects = [], isLoading: loadingProjects, error: errProjects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });

  const { data: verifications = [], isLoading: loadingVerifications, error: errVerifications } = useQuery<Verification[]>({
    queryKey: ["verifications"],
    queryFn: () => fetchVerifications(),
  });

  const { data: budgetTimeline = [], isLoading: loadingBudget, error: errBudget } = useQuery<BudgetData[]>({
    queryKey: ["budgetTimeline"],
    queryFn: () => fetchBudgetTimeline(),
  });

  const loading = loadingProjects || loadingVerifications || loadingBudget;
  const errorObj = errProjects || errVerifications || errBudget;
  const error = errorObj instanceof Error ? errorObj.message : errorObj ? String(errorObj) : null;

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgProgress =
    projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
      : 0;
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const failedCount = verifications.filter((v) => v.status === "failed").length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
            DASHBOARD OVERVIEW
          </h1>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
            {loading
              ? "Loading live data from API…"
              : error
              ? `⚠ ${error}`
              : `Live data · ${projects.length} projects · ${verifications.length} verifications`}
          </p>
        </div>

        {loading && (
          <div
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)", padding: "2rem 0" }}
          >
            Fetching from CivicPulse API…
          </div>
        )}

        {!loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard label="Active Projects" value={activeProjects.toString()} subtext={`${completedProjects} completed`} trend="up" color="#00D4FF" />
              <KPICard label="Budget Utilization" value={`${totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%`} subtext={`${formatCurrency(totalSpent)} of ${formatCurrency(totalBudget)}`} trend="up" color="#00E676" />
              <KPICard label="AI Verifications" value={`${verifiedCount}/${verifications.length}`} subtext={`${failedCount} failed`} trend={failedCount > 0 ? "down" : "neutral"} color="#FFB347" />
              <KPICard label="Avg Progress" value={`${avgProgress}%`} subtext="Across all projects" trend="up" color="#FF4757" />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Budget Chart */}
              <div className="lg:col-span-2 cyber-card shadow-sm">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    BUDGET ALLOCATION vs SPEND (per project · Crores ₹)
                  </span>
                  <span className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "var(--font-mono)" }}>
                    LIVE
                  </span>
                </div>
                <div className="p-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetTimeline} barGap={4}>
                      <XAxis dataKey="month" tick={{ fill: "#8B949E", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#8B949E", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} unit="Cr" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#161B22", border: "1px solid #30363d", borderRadius: 0, fontSize: 11, fontFamily: "JetBrains Mono" }}
                        labelStyle={{ color: "#8B949E" }}
                      />
                      <Bar dataKey="allocated" fill="#00D4FF" opacity={0.3} name="Allocated" />
                      <Bar dataKey="spent" fill="#00D4FF" name="Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Verification Status */}
              <div className="cyber-card shadow-sm">
                <div className="px-5 py-3 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    VERIFICATION STATUS
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  {verifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      No evidence uploaded yet.
                    </p>
                  ) : (
                    verifications.slice(0, 5).map((v) => (
                      <div key={v.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: verificationColors[v.status] }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{v.projectName}</p>
                          <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                            {v.date}
                          </span>
                        </div>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5"
                          style={{ color: verificationColors[v.status], fontFamily: "var(--font-mono)" }}
                        >
                          {v.status.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Project Status Grid */}
            <div className="cyber-card shadow-sm">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  PROJECT STATUS GRID
                </span>
                <span className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "var(--font-mono)" }}>
                  {projects.length} TOTAL
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["ID", "PROJECT", "TYPE", "LOCATION", "BUDGET", "SPENT", "PROGRESS", "STATUS"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[10px] font-medium text-muted-foreground px-5 py-2.5 uppercase tracking-wider"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{p.id}</td>
                        <td className="px-5 py-3 text-xs text-foreground">{p.name}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{p.type}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{p.location}</td>
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(p.budget)}</td>
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(p.spent)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted">
                              <div className="h-full" style={{ width: `${p.progress}%`, backgroundColor: statusColors[p.status] }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors[p.status] }} />
                            <span className="text-[10px] font-medium uppercase" style={{ color: statusColors[p.status], fontFamily: "var(--font-mono)" }}>
                              {p.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function KPICard({ label, value, subtext, trend, color }: { label: string; value: string; subtext: string; trend: string; color: string }) {
  const icons: Record<string, React.ReactNode> = {
    up: <TrendingUp size={14} />,
    down: <TrendingDown size={14} />,
    neutral: <Clock size={14} />,
  };

  return (
    <div className="cyber-card cyber-card-hover relative overflow-hidden shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
      <div className="p-5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold" style={{ fontFamily: "var(--font-mono)" }}>
          {label}
        </span>
        <div className="flex items-end justify-between mt-2">
          <span className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
            {value}
          </span>
          <span className="text-muted-foreground" style={{ color }}>
            {icons[trend]}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
          {subtext}
        </p>
      </div>
    </div>
  );
}
