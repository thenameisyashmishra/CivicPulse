/*
 * Login — CivicPulse
 * National Public Works Audit, Visual Verification & Governance Platform.
 * High-contrast, accessible authentication with Meri Pehchaan GovID and Quick-Fill Demo Personas.
 */
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Shield,
  HardHat,
  Landmark,
  UserCheck,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import { login } from "@/lib/data";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

export default function Login() {
  const navigate = (to: string) => {
    window.location.href = to;
  };
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Authentication successful! Welcome to CivicPulse.");
      navigate("/");
    } catch (err: unknown) {
      let msg = "Login failed. Check your credentials.";
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          msg = parsed?.detail || msg;
        } catch {
          msg = err.message || msg;
        }
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: "admin" | "engineer" | "pradhan" | "citizen") {
    const creds = {
      admin: { email: "admin@civicpulse.gov.in", password: "Admin@1234", label: "State Vigilance Director" },
      engineer: { email: "engineer@civicpulse.gov.in", password: "Engineer@1234", label: "Executive Engineer" },
      pradhan: { email: "pradhan@civicpulse.gov.in", password: "Pradhan@1234", label: "Gram Pradhan" },
      citizen: { email: "citizen@civicpulse.gov.in", password: "Citizen@1234", label: "Verified Citizen" },
    };

    const target = creds[role];
    setEmail(target.email);
    setPassword(target.password);
    setActiveRole(role);
    setError(null);
    toast.info(`Filled credentials for ${target.label}`);
  }

  const demoRoles = [
    {
      id: "admin" as const,
      roleName: "Admin",
      subtitle: "State Vigilance Director",
      icon: Shield,
      badgeColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    },
    {
      id: "engineer" as const,
      roleName: "Engineer",
      subtitle: "Executive Engineer / VDO",
      icon: HardHat,
      badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "pradhan" as const,
      roleName: "Pradhan",
      subtitle: "Village Head / Site Sign-off",
      icon: Landmark,
      badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "citizen" as const,
      roleName: "Citizen",
      subtitle: "Verified Local Resident",
      icon: UserCheck,
      badgeColor: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      {/* Top Accessibility & Ministry Bar */}
      <header className="w-full bg-card/80 backdrop-blur-md border-b border-border/80 px-4 sm:px-8 py-2.5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            🏛️ भारत सरकार | Government of India
          </span>
          <span className="hidden sm:inline text-muted-foreground">•</span>
          <span className="hidden sm:inline text-muted-foreground text-[11px]">
            Ministry of Rural Development & Panchayati Raj
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-xs text-foreground font-medium transition cursor-pointer shadow-xs"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Color Theme Switcher"
        >
          {theme === "dark" ? (
            <>
              <Sun size={13} className="text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={13} className="text-primary" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md bg-card border border-border/90 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden backdrop-blur-md">
          {/* Top National Accent Stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-cyan-600 via-primary to-blue-600 absolute top-0 left-0" />

          <div className="p-6 sm:p-8">
            {/* Header Crest & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary mb-3 shadow-inner">
                <svg
                  viewBox="0 0 28 28"
                  className="w-7 h-7 text-primary"
                  aria-label="CivicPulse Logo"
                >
                  <rect x="1" y="1" width="26" height="26" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" rx="4" />
                  <path
                    d="M5 14 L10 14 L12 8 L16 20 L18 14 L23 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="14" cy="14" r="2.5" fill="currentColor" />
                </svg>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-1">
                CIVIC<span className="text-primary font-black">PULSE</span>
              </h1>
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                National Public Works Audit & Verification System
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/25">
                <CheckCircle2 size={11} />
                <span>IT Act §65B & Meri Pehchaan e-Auth</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{error}</span>
              </div>
            )}

            {/* Sign-in Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="cp-email"
                  className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"
                >
                  <Mail size={13} className="text-primary" />
                  <span>Official Email or GovID</span>
                </label>
                <input
                  id="cp-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@civicpulse.gov.in"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm text-foreground placeholder:text-muted-foreground/60 transition shadow-inner font-sans outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="cp-password"
                  className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"
                >
                  <Lock size={13} className="text-primary" />
                  <span>Password</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="cp-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm text-foreground placeholder:text-muted-foreground/60 transition shadow-inner font-sans outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed uppercase"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Authenticating Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workstation</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Personas Section */}
            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  Quick-Fill Demo Personas
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">Click to test</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {demoRoles.map((role) => {
                  const Icon = role.icon;
                  const isSelected = activeRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => fillDemo(role.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                          : "border-border/80 bg-background/60 hover:bg-muted/40 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center border ${role.badgeColor}`}
                        >
                          <Icon size={13} />
                        </span>
                        <span className="text-[9px] font-mono font-bold uppercase text-muted-foreground">
                          ROLE
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground tracking-tight">
                          {role.roleName}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                          {role.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="bg-muted/40 px-6 py-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Sovereign TLS 1.3
            </span>
            <span>GIGW 3.0 & DPDP 2023</span>
          </div>
        </div>
      </main>
    </div>
  );
}
