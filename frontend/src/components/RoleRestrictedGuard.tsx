import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { ShieldAlert, ArrowLeft, UserCheck, Lock } from "lucide-react";
import { getSavedUser, saveUser, DEMO_PERSONAS } from "@/lib/data";
import { toast } from "sonner";
import DashboardLayout from "./DashboardLayout";

interface RoleRestrictedGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  hubName: string;
}

export default function RoleRestrictedGuard({
  children,
  allowedRoles,
  hubName,
}: RoleRestrictedGuardProps) {
  const [user, setUser] = useState(getSavedUser());

  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(getSavedUser());
    };
    window.addEventListener("cp_user_updated", handleUserUpdate);
    return () => window.removeEventListener("cp_user_updated", handleUserUpdate);
  }, []);

  const currentRole = user?.role || "citizen";
  const hasAccess = allowedRoles.includes(currentRole);

  if (hasAccess) {
    return <>{children}</>;
  }

  const handleElevateRole = (roleKey: string) => {
    const persona = DEMO_PERSONAS.find((p) => p.role === roleKey);
    if (persona) {
      saveUser(persona);
      toast.success(`Switched role persona to: ${persona.label}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="bg-card border border-destructive/30 rounded-2xl p-8 shadow-lg text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/25">
              <ShieldAlert className="w-3.5 h-3.5" /> Restricted Departmental Access
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {hubName} Clearance Required
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              This governance module is protected under MeitY GIGW 3.0 & IT Act 2000 guidelines. Access is restricted to accredited departmental engineers and state vigilance officers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border inline-block text-left text-xs font-mono space-y-1.5">
            <div>Current Active Account: <strong className="text-foreground">{user?.name || "Civilian User"}</strong></div>
            <div>Current Role: <span className="text-amber-600 dark:text-amber-400 font-bold uppercase">{currentRole}</span></div>
            <div>Required Roles: <span className="text-primary font-bold">{allowedRoles.join(" | ").toUpperCase()}</span></div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-lg border border-border hover:bg-accent text-xs font-semibold text-foreground flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Public Portal
            </Link>

            <button
              onClick={() => handleElevateRole("admin")}
              className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              Switch to State Admin Persona (Demo Evaluation)
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
