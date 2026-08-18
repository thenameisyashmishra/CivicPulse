/*
 * Reports — CivicPulse
 * Generated reports with charts, filters, and CSV export.
 * Data loaded live from GET /api/projects, /api/evidence, /api/reports/budget-summary.
 */
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchProjects,
  fetchVerifications,
  fetchBudgetTimeline,
  formatCurrency,
  statusColors,
  budgetCsvUrl,
  type Project,
  type Verification,
  type BudgetData,
} from "@/lib/data";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { FileDown, Filter } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [projects, setProjects]         = useState<Project[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [budgetTimeline, setBudgetTimeline] = useState<BudgetData[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [dateRange, setDateRange]       = useState("last-7-days");

  useEffect(() => {
    Promise.all([fetchProjects(), fetchVerifications(), fetchBudgetTimeline()])
      .then(([ps, vs, bt]) => {
        setProjects(ps);
        setVerifications(vs);
        setBudgetTimeline(bt);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent  = projects.reduce((s, p) => s + p.spent, 0);

  const statusData = [
    { name: "Active",    value: projects.filter((p) => p.status === "active").length,    color: "#00D4FF" },
    { name: "Completed", value: projects.filter((p) => p.status === "completed").length, color: "#00E676" },
    { name: "Delayed",   value: projects.filter((p) => p.status === "delayed").length,   color: "#FFB347" },
    { name: "Flagged",   value: projects.filter((p) => p.status === "flagged").length,   color: "#FF4757" },
  ];

  const verificationData = [
    { name: "Verified", value: verifications.filter((v) => v.status === "verified").length, color: "#00E676" },
    { name: "Pending",  value: verifications.filter((v) => v.status === "pending").length,  color: "#00D4FF" },
    { name: "Failed",   value: verifications.filter((v) => v.status === "failed").length,   color: "#FF4757" },
    { name: "Review",   value: verifications.filter((v) => v.status === "review").length,   color: "#FFB347" },
  ];

  const handleExportCsv = () => {
    const token = localStorage.getItem("cp_token");
    // Open CSV in new tab — auth header can't be set on window.open,
    // so we fetch the blob and trigger a download instead.
    fetch(budgetCsvUrl(), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "civicpulse-budget-summary.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV downloaded successfully");
      })
      .catch(() => toast.error("Export failed — make sure the backend is running."));
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              REPORTS & ANALYTICS
            </h1>
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {loading ? "Loading from API…" : error ? `⚠ ${error}` : "Live performance metrics and project analytics"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border text-muted-foreground text-xs hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <FileDown size={12} />
              CSV
            </button>
            <button
              onClick={() => toast.info("PDF export — integrate a PDF library for production.")}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border text-muted-foreground text-xs hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <FileDown size={12} />
              PDF
            </button>
          </div>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {["last-7-days", "last-30-days", "this-quarter", "this-year"].map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                dateRange === r
                  ? "bg-primary/15 border border-primary/40 text-primary"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {r === "last-7-days" ? "7 DAYS" : r === "last-30-days" ? "30 DAYS" : r === "this-quarter" ? "QUARTER" : "YEAR"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-xs text-muted-foreground py-8" style={{ fontFamily: "var(--font-mono)" }}>
            Fetching from CivicPulse API…
          </div>
        ) : error ? (
          <div className="p-4 text-xs border" style={{ background: "rgba(255,71,87,0.08)", borderColor: "rgba(255,71,87,0.3)", color: "#FF4757", fontFamily: "var(--font-mono)" }}>
            {error}
          </div>
        ) : (
          <>
            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Budget trend (per-project) */}
              <div className="bg-card border border-border">
                <div className="px-5 py-3 border-b border-border">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                    BUDGET vs SPEND (Cr ₹)
                  </span>
                </div>
                <div className="p-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={budgetTimeline}>
                      <XAxis dataKey="month" tick={{ fill: "#8B949E", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#8B949E", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} unit="Cr" />
                      <Tooltip contentStyle={{ backgroundColor: "#161B22", border: "1px solid #30363d", borderRadius: 0, fontSize: 11, fontFamily: "JetBrains Mono" }} />
                      <Line type="monotone" dataKey="allocated" stroke="#00D4FF" strokeWidth={2} dot={false} name="Allocated" />
                      <Line type="monotone" dataKey="spent"     stroke="#FFB347" strokeWidth={2} dot={false} name="Spent" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Project status pie */}
              <div className="bg-card border border-border">
                <div className="px-5 py-3 border-b border-border">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>PROJECT DISTRIBUTION</span>
                </div>
                <div className="p-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                        {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#161B22", border: "1px solid #30363d", borderRadius: 0, fontSize: 11, fontFamily: "JetBrains Mono" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="px-5 pb-3 flex gap-3 flex-wrap">
                  {statusData.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{s.name} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification pie */}
              <div className="bg-card border border-border">
                <div className="px-5 py-3 border-b border-border">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>VERIFICATION OUTCOMES</span>
                </div>
                <div className="p-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={verificationData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                        {verificationData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#161B22", border: "1px solid #30363d", borderRadius: 0, fontSize: 11, fontFamily: "JetBrains Mono" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="px-5 pb-3 flex gap-3 flex-wrap">
                  {verificationData.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{s.name} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget summary table */}
            <div className="bg-card border border-border">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                  BUDGET SUMMARY BY PROJECT
                </span>
                <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  Total: {formatCurrency(totalBudget)} · Spent: {formatCurrency(totalSpent)}
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["PROJECT", "ALLOCATION", "SPENT", "REMAINING", "UTILIZATION", "STATUS"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-medium text-muted-foreground px-5 py-2.5 uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const remaining   = p.budget - p.spent;
                    const utilization = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
                    const isOver      = p.spent > p.budget;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-accent/50">
                        <td className="px-5 py-3"><span className="text-xs text-foreground">{p.name}</span></td>
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(p.budget)}</td>
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(p.spent)}</td>
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)", color: isOver ? "#FF4757" : "#00E676" }}>
                          {isOver ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted">
                              <div
                                className="h-full"
                                style={{
                                  width: `${Math.min(utilization, 100)}%`,
                                  backgroundColor: isOver ? "#FF4757" : utilization > 80 ? "#FFB347" : "#00D4FF",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{utilization}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-medium uppercase" style={{ color: statusColors[p.status], fontFamily: "var(--font-mono)" }}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
