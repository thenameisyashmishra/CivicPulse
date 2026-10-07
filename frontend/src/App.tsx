import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import RoleRestrictedGuard from "./components/RoleRestrictedGuard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { getToken } from "./lib/data";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// Code-split route bundles for instant sub-100ms navigation
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const Verifications = lazy(() => import("./pages/Verifications"));
const SiteMap = lazy(() => import("./pages/SiteMap"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const AccountabilityHub = lazy(() => import("./pages/AccountabilityHub"));
const TransparencyPortal = lazy(() => import("./pages/TransparencyPortal"));
const LifecycleHub = lazy(() => import("./pages/LifecycleHub"));
const EngineeringVisionHub = lazy(() => import("./pages/EngineeringVisionHub"));
const FraudIntelCenter = lazy(() => import("./pages/FraudIntelCenter"));
const CitizenEngagementPortal = lazy(() => import("./pages/CitizenEngagementPortal"));
const GovSecurityCenter = lazy(() => import("./pages/GovSecurityCenter"));
const PolicyGovernanceHub = lazy(() => import("./pages/PolicyGovernanceHub"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground animate-pulse">Loading CivicPulse...</span>
      </div>
    </div>
  );
}

/** Instant auth gate without layout shift */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();

  if (!token) {
    return <Redirect to="/login" replace />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        <Route path="/projects">
          <ProtectedRoute><Projects /></ProtectedRoute>
        </Route>
        <Route path="/verifications">
          <ProtectedRoute><Verifications /></ProtectedRoute>
        </Route>
        <Route path="/accountability">
          <ProtectedRoute>
            <RoleRestrictedGuard allowedRoles={["admin", "engineer", "pradhan"]} hubName="Social Accountability & Public Hearings">
              <AccountabilityHub />
            </RoleRestrictedGuard>
          </ProtectedRoute>
        </Route>
        <Route path="/transparency" component={TransparencyPortal} />
        <Route path="/lifecycle">
          <ProtectedRoute>
            <RoleRestrictedGuard allowedRoles={["admin", "engineer", "pradhan"]} hubName="Project Lifecycle Tracking Hub">
              <LifecycleHub />
            </RoleRestrictedGuard>
          </ProtectedRoute>
        </Route>
        <Route path="/engineering">
          <ProtectedRoute>
            <RoleRestrictedGuard allowedRoles={["admin", "engineer"]} hubName="Engineering Vision AI Hub">
              <EngineeringVisionHub />
            </RoleRestrictedGuard>
          </ProtectedRoute>
        </Route>
        <Route path="/fraud-intel">
          <ProtectedRoute>
            <RoleRestrictedGuard allowedRoles={["admin", "engineer"]} hubName="Fraud & Anomaly Intelligence Center">
              <FraudIntelCenter />
            </RoleRestrictedGuard>
          </ProtectedRoute>
        </Route>
        <Route path="/engagement" component={CitizenEngagementPortal} />
        <Route path="/gov-security">
          <ProtectedRoute>
            <RoleRestrictedGuard allowedRoles={["admin"]} hubName="Government Interoperability & Security Center">
              <GovSecurityCenter />
            </RoleRestrictedGuard>
          </ProtectedRoute>
        </Route>
        <Route path="/policy-governance">
          <ProtectedRoute>
            <RoleRestrictedGuard allowedRoles={["admin"]} hubName="Policy, Scale & AI Model Governance Hub">
              <PolicyGovernanceHub />
            </RoleRestrictedGuard>
          </ProtectedRoute>
        </Route>
        <Route path="/map">
          <ProtectedRoute><SiteMap /></ProtectedRoute>
        </Route>
        <Route path="/reports">
          <ProtectedRoute><Reports /></ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute><Settings /></ProtectedRoute>
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Enterprise high-performance query caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 minutes stale time (instant in-memory render)
      gcTime: 15 * 60 * 1000,    // 15 minutes cache garbage collection
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="light" switchable={true}>
          <SidebarProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SidebarProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
