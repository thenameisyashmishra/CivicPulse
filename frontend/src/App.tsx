import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const token = getToken();

  if (!token) {
    navigate("/login", { replace: true });
    return null;
  }
  return <Component />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/projects" component={() => <ProtectedRoute component={Projects} />} />
        <Route path="/verifications" component={() => <ProtectedRoute component={Verifications} />} />
        <Route path="/map" component={() => <ProtectedRoute component={SiteMap} />} />
        <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
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
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
