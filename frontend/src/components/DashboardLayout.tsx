import Sidebar from "./Sidebar";
import Header from "./Header";
import GIGWHeader from "./GIGWHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* National Portal GIGW 3.0 Accessibility Bar */}
      <GIGWHeader />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main id="main-content" className="flex-1 overflow-y-auto bg-background focus:outline-none">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
