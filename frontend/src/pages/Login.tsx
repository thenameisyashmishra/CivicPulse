/*
 * Login — CivicPulse
 * Authenticates against POST /api/auth/login and saves the JWT.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { login } from "@/lib/data";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
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
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: "admin" | "engineer" | "pradhan" | "citizen") {
    const creds: Record<string, { email: string; password: string }> = {
      admin:    { email: "admin@civicpulse.gov.in",    password: "Admin@1234" },
      pradhan:  { email: "pradhan@civicpulse.gov.in",  password: "Pradhan@1234" },
      engineer: { email: "engineer@civicpulse.gov.in", password: "Engineer@1234" },
      citizen:  { email: "citizen@civicpulse.gov.in",  password: "Citizen@1234" },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderTop: "3px solid #00D4FF",
          padding: "2rem",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#00D4FF",
              letterSpacing: "0.15em",
              marginBottom: 6,
            }}
          >
            CIVICPULSE — AUTHENTICATION
          </p>
          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            Sign In
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--muted-foreground)",
              marginTop: 4,
            }}
          >
            Public Works Monitoring & Verification System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              htmlFor="cp-email"
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--muted-foreground)",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              EMAIL
            </label>
            <input
              id="cp-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@civicpulse.gov.in"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="cp-password"
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--muted-foreground)",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              PASSWORD
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="cp-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "0.55rem 2.25rem 0.55rem 0.75rem",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 8,
                  background: "none",
                  border: "none",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "0.5rem 0.75rem",
                background: "rgba(255,71,87,0.08)",
                border: "1px solid rgba(255,71,87,0.3)",
                color: "#FF4757",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.65rem",
              background: loading ? "rgba(0,212,255,0.1)" : "rgba(0,212,255,0.15)",
              border: "1px solid rgba(0,212,255,0.4)",
              color: "#00D4FF",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.08em",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              marginTop: 4,
            }}
          >
            {loading ? "AUTHENTICATING…" : "SIGN IN →"}
          </button>
        </form>

        {/* Demo quick-fill */}
        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--muted-foreground)",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            DEMO ACCOUNTS — click to fill:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {(["admin", "engineer", "pradhan", "citizen"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => fillDemo(role)}
                style={{
                  padding: "0.4rem 0.5rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                }}
              >
                {role.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
