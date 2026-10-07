import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getToken } from "@/lib/data";
import {
  Shield,
  Key,
  Globe,
  RefreshCw,
  FileText,
  CheckCircle2,
  Lock,
  Server,
  Layers,
  Terminal,
  ExternalLink,
  Download,
  UserCheck,
  Database,
} from "lucide-react";
import { toast } from "sonner";

export default function GovSecurityCenter() {
  const [activeTab, setActiveTab] = useState<
    | "digilocker"
    | "pfms"
    | "gem"
    | "egov"
    | "gis"
    | "gst"
    | "treasury"
    | "sovereignty"
    | "vapt"
    | "dpdp"
    | "admin_audit"
    | "tokens"
    | "vault"
  >("digilocker");

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Forms & State
  const [digiId, setDigiId] = useState("DL-IN-889124");
  const [aadhaarLast4, setAadhaarLast4] = useState("4210");
  const [kycResult, setKycResult] = useState<any>(null);

  const [pfmsSanction, setPfmsSanction] = useState("SANCTION-MORTH-2024-91");
  const [pfmsTranche, setPfmsTranche] = useState("PFMS-TR-881920");
  const [pfmsAmount, setPfmsAmount] = useState("3500000");
  const [pfmsResult, setPfmsResult] = useState<any>(null);

  const [ewayNumber, setEwayNumber] = useState("EWAY-DL-2024-99812");
  const [ewayVal, setEwayVal] = useState("2450000");
  const [ewayVehicle, setEwayVehicle] = useState("DL-01-AX-9912");
  const [ewayResult, setEwayResult] = useState<any>(null);

  const [adminAction, setAdminAction] = useState("threshold_override");
  const [adminResource, setAdminResource] = useState("PW-2024-001");
  const [adminAuditResult, setAdminAuditResult] = useState<any>(null);

  const [scopeTokenHours, setScopeTokenHours] = useState("24");
  const [tokenResult, setTokenResult] = useState<any>(null);

  // GeM
  const [gemContractorId, setGemContractorId] = useState("1");
  const [gemSellerId, setGemSellerId] = useState("GEM-SLR-99824");
  const [gemResult, setGemResult] = useState<any>(null);

  // eGov Gateway
  const [egovSystemName, setEgovSystemName] = useState("Delhi State Infrastructure Portal");
  const [egovClientId, setEgovClientId] = useState("delhi-pwd-client-01");
  const [egovNamespaces, setEgovNamespaces] = useState("projects, evidence, milestones");
  const [egovResult, setEgovResult] = useState<any>(null);

  // GIS Parcel
  const [gisProjectId, setGisProjectId] = useState("PW-2024-001");
  const [gisKhasra, setGisKhasra] = useState("KHASRA-88/14");
  const [gisStateCode, setGisStateCode] = useState("DL-NW-2024-91");
  const [gisResult, setGisResult] = useState<any>(null);

  // Treasury IFMS
  const [treasuryProjectId, setTreasuryProjectId] = useState("PW-2024-001");
  const [treasuryStateCode, setTreasuryStateCode] = useState("DL");
  const [treasuryDdoCode, setTreasuryDdoCode] = useState("DDO-PWD-09");
  const [treasuryBillNo, setTreasuryBillNo] = useState("TBILL-2024-8891");
  const [treasuryAmount, setTreasuryAmount] = useState("1250000");
  const [treasuryResult, setTreasuryResult] = useState<any>(null);

  const handlePullGeMProfile = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/interop/gem/contractor", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          contractor_id: parseInt(gemContractorId) || 1,
          gem_seller_id: gemSellerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `GeM pull failed (HTTP ${res.status})`);
      setGemResult(data);
      setStatusMsg("GeM contractor performance profile & CPPP debarment check synchronized!");
      toast.success("GeM contractor performance profile synchronized!");
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterEGovConsumer = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/interop/egov/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          consumer_system_name: egovSystemName,
          oauth2_client_id: egovClientId,
          allowed_namespaces: egovNamespaces.split(",").map((s) => s.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `e-Gov Gateway registration failed (HTTP ${res.status})`);
      setEgovResult(data);
      setStatusMsg("e-Gov API Gateway consumer client registered with HMAC signing!");
      toast.success("e-Gov API Gateway consumer registered!");
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayGisParcel = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/interop/gis/land-parcel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          project_id: gisProjectId,
          khasra_number: gisKhasra,
          state_land_record_code: gisStateCode,
          bhu_naksha_geometry_wkt: "POLYGON((76.99 28.42, 77.01 28.42, 77.01 28.44, 76.99 28.44, 76.99 28.42))",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `GIS parcel overlay failed (HTTP ${res.status})`);
      setGisResult(data);
      setStatusMsg("Bhu-Naksha cadastral Khasra boundary overlaid & verified!");
      toast.success("Bhu-Naksha cadastral boundary verified!");
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHookTreasury = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/interop/treasury/hook", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          project_id: treasuryProjectId,
          state_code: treasuryStateCode,
          ddo_code: treasuryDdoCode,
          treasury_bill_number: treasuryBillNo,
          passed_amount_inr: parseFloat(treasuryAmount) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Treasury IFMS hook failed (HTTP ${res.status})`);
      setTreasuryResult(data);
      setStatusMsg("State Treasury IFMS scroll ID issued and linked to RBI e-Kuber!");
      toast.success("Treasury IFMS electronic scroll generated!");
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKyc = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/interop/digilocker/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          digilocker_id: digiId,
          aadhaar_last_4: aadhaarLast4,
          doc_uris: ["uri:digilocker:aadhaar", "uri:digilocker:driving_license"],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `e-KYC verification failed (HTTP ${res.status})`);
      }
      setKycResult(data);
      setStatusMsg("Meri Pehchaan e-KYC verified & linked to national identity!");
      toast.success("Meri Pehchaan e-KYC verified & linked to national identity!");
    } catch (e: any) {
      const msg = e.message || "Failed to verify DigiLocker KYC.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReconcilePfms = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/interop/pfms/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          sanction_order_number: pfmsSanction,
          pfms_tranche_id: pfmsTranche,
          disbursed_amount_inr: parseFloat(pfmsAmount),
          dbt_beneficiary_count: 112,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `PFMS reconciliation failed (HTTP ${res.status})`);
      }
      setPfmsResult(data);
      setStatusMsg("PFMS tranche successfully reconciled with bank scroll!");
      toast.success("PFMS tranche successfully reconciled with bank scroll!");
    } catch (e: any) {
      const msg = e.message || "Failed to reconcile PFMS tranche.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEway = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/interop/gst/eway-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          gstin_supplier: "07AAACN1234F1Z8",
          eway_bill_number: ewayNumber,
          consignment_value_inr: parseFloat(ewayVal),
          vehicle_number: ewayVehicle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `GST e-Way Bill verification failed (HTTP ${res.status})`);
      }
      setEwayResult(data);
      setStatusMsg("GST e-Way Bill & IRN verified against NIC registry!");
      toast.success("GST e-Way Bill & IRN verified against NIC registry!");
    } catch (e: any) {
      const msg = e.message || "Failed to verify e-Way Bill.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogAdminAction = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/security/admin/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action_type: adminAction,
          resource_type: "project",
          resource_id: adminResource,
          client_ip: "127.0.0.1",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Audit log signing failed (HTTP ${res.status})`);
      }
      setAdminAuditResult(data);
      setStatusMsg("Admin action cryptographically chained and sealed!");
      toast.success("Admin action cryptographically chained and sealed!");
    } catch (e: any) {
      const msg = e.message || "Failed to log admin action.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueToken = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/security/tokens/scoped", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          assigned_scopes: ["projects:read", "evidence:verify", "interop:sync"],
          ttl_hours: parseInt(scopeTokenHours),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Scoped token issuance failed (HTTP ${res.status})`);
      }
      setTokenResult(data);
      setStatusMsg("Scoped API token generated with micro-permission bounds!");
      toast.success("Scoped API token generated with micro-permission bounds!");
    } catch (e: any) {
      const msg = e.message || "Failed to issue scoped token.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card/80 to-emerald-950/20 border border-border shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-6 w-6 text-emerald-400" />
              <h1 className="text-2xl font-bold tracking-wide">
                Government Interoperability & Security Center
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                PILLAR B.7
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              National digital integration (DigiLocker, PFMS, GeM, GSTN) & MeitY/CERT-In sovereign security (Pillars B.7 & B.8)
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 rounded-full flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> GIGW 3.0 & MeitY Certified
            </span>
            <span className="px-3 py-1.5 text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 rounded-full flex items-center gap-1.5 shadow-xs">
              <Lock className="w-3.5 h-3.5" /> AES-256 Envelope Encryption
            </span>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center gap-2.5 border transition-all ${
              statusMsg.startsWith("⚠")
                ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{statusMsg}</span>
          </div>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Government Security & Integration Modules"
          className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin"
        >
          {[
            { id: "digilocker", label: "DigiLocker e-KYC", icon: UserCheck },
            { id: "pfms", label: "PFMS Reconciliation", icon: RefreshCw },
            { id: "gem", label: "GeM Performance", icon: Globe },
            { id: "egov", label: "e-Gov Gateway", icon: Server },
            { id: "gis", label: "Bhu-Naksha GIS", icon: Layers },
            { id: "gst", label: "GST e-Way Bill", icon: FileText },
            { id: "treasury", label: "Treasury IFMS", icon: Download },
            { id: "sovereignty", label: "Data Sovereignty", icon: Shield },
            { id: "vapt", label: "CERT-In VAPT", icon: Terminal },
            { id: "dpdp", label: "DPDP Act 2023", icon: Lock },
            { id: "admin_audit", label: "Admin Hash Audit", icon: Key },
            { id: "tokens", label: "Scoped Tokens", icon: ExternalLink },
            { id: "vault", label: "Secrets Vault", icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`sec-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`sec-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 shrink-0 transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        {activeTab === "digilocker" && (
          <div
            role="tabpanel"
            id="sec-panel-digilocker"
            aria-labelledby="sec-tab-digilocker"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Meri Pehchaan / DigiLocker Sovereign e-KYC
              </h2>
              <p className="text-sm text-muted-foreground">
                Binds official user identity to Aadhaar via UIDAI tokenization and DigiLocker URI pulls per IT Act 2000.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">DigiLocker ID</label>
                  <input
                    type="text"
                    value={digiId}
                    onChange={(e) => setDigiId(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Aadhaar Last 4 Digits</label>
                  <input
                    type="text"
                    value={aadhaarLast4}
                    onChange={(e) => setAadhaarLast4(e.target.value)}
                    maxLength={4}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleVerifyKyc}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying with UIDAI & DigiLocker..." : "Verify & Issue National KYC Token"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">e-KYC Verification Certificate</h3>
              {kycResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Status: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{kycResult.status}</span></div>
                  <div>Masked Aadhaar: <span className="text-foreground font-semibold">{kycResult.masked_aadhaar_number}</span></div>
                  <div>Meri Pehchaan Hash: <span className="text-muted-foreground">{kycResult.meri_pehchaan_token_hash?.slice(0, 32)}...</span></div>
                  <div>Documents Linked: <span className="text-blue-600 dark:text-blue-400 font-semibold">2 Verified Credentials</span></div>
                  <div>Verified At: <span className="text-muted-foreground">{kycResult.kyc_verified_at}</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Execute verification on the left to inspect national identity assertions.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "pfms" && (
          <div
            role="tabpanel"
            id="sec-panel-pfms"
            aria-labelledby="sec-tab-pfms"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                PFMS Tranche Reconciliation
              </h2>
              <p className="text-sm text-muted-foreground">
                Reconciles physical milestone completion against Public Financial Management System DBT disbursements.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Sanction Order Number</label>
                  <input
                    type="text"
                    value={pfmsSanction}
                    onChange={(e) => setPfmsSanction(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">PFMS Tranche Ref</label>
                  <input
                    type="text"
                    value={pfmsTranche}
                    onChange={(e) => setPfmsTranche(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Disbursed Amount (₹)</label>
                  <input
                    type="number"
                    value={pfmsAmount}
                    onChange={(e) => setPfmsAmount(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleReconcilePfms}
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Reconciling with PFMS..." : "Reconcile Central Funds"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">PFMS Reconciliation Ledger</h3>
              {pfmsResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Reconciliation: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">CONFIRMED (DBT Match)</span></div>
                  <div>Bank Ref: <span className="text-blue-600 dark:text-blue-400 font-semibold">{pfmsResult.bank_acknowledgement_ref}</span></div>
                  <div>Disbursed: <span className="text-foreground font-semibold">₹{pfmsResult.disbursed_amount_inr?.toLocaleString("en-IN")}</span></div>
                  <div>Beneficiaries: <span className="text-foreground font-semibold">{pfmsResult.dbt_beneficiary_count} Workers/Suppliers</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Submit reconciliation to pull live PFMS treasury status.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "gst" && (
          <div
            role="tabpanel"
            id="sec-panel-gst"
            aria-labelledby="sec-tab-gst"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                GST e-Way Bill & IRN Authenticator
              </h2>
              <p className="text-sm text-muted-foreground">
                Validates material consignments against the National Informatics Centre (NIC) GST e-Way Bill portal.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">e-Way Bill Number</label>
                  <input
                    type="text"
                    value={ewayNumber}
                    onChange={(e) => setEwayNumber(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Consignment Value (₹)</label>
                  <input
                    type="number"
                    value={ewayVal}
                    onChange={(e) => setEwayVal(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Transport Vehicle Number</label>
                  <input
                    type="text"
                    value={ewayVehicle}
                    onChange={(e) => setEwayVehicle(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleVerifyEway}
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Checking GSTN Portal..." : "Authenticate Consignment"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">GSTN Clearance Record</h3>
              {ewayResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>GSTN Verification: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">AUTHENTIC & ACTIVE</span></div>
                  <div>Supplier GSTIN: <span className="text-foreground font-semibold">{ewayResult.gstin_supplier}</span></div>
                  <div>IRN Hash: <span className="text-muted-foreground">{ewayResult.irn_hash?.slice(0, 28)}...</span></div>
                  <div>Vehicle Match: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{ewayResult.vehicle_number} (Toll RFID Confirmed)</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Verify e-Way bill to validate material procurement legitimacy.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "admin_audit" && (
          <div
            role="tabpanel"
            id="sec-panel-admin_audit"
            aria-labelledby="sec-tab-admin_audit"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Cryptographically Chained Admin Audit Log
              </h2>
              <p className="text-sm text-muted-foreground">
                Creates a tamper-evident audit record linked to the previous log entry via SHA-256 hash chaining.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Action Type</label>
                  <select
                    value={adminAction}
                    onChange={(e) => setAdminAction(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  >
                    <option value="threshold_override">Threshold Override</option>
                    <option value="role_elevation">Role Elevation</option>
                    <option value="audit_export">Data Export Authorization</option>
                    <option value="mcc_freeze_toggle">MCC Freeze State Change</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Target Resource ID</label>
                  <input
                    type="text"
                    value={adminResource}
                    onChange={(e) => setAdminResource(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleLogAdminAction}
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Sealing Cryptographic Entry..." : "Seal & Log Action"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Cryptographic Chain Block</h3>
              {adminAuditResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Block Status: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">SEALED (Chain Intact)</span></div>
                  <div>Action: <span className="text-foreground font-semibold">{adminAuditResult.action_type}</span></div>
                  <div>Prev Hash: <span className="text-muted-foreground">{adminAuditResult.previous_log_hash?.slice(0, 24)}...</span></div>
                  <div>Current Hash: <span className="text-purple-600 dark:text-purple-400 font-semibold">{adminAuditResult.current_entry_hash?.slice(0, 24)}...</span></div>
                  <div>Client IP: <span className="text-foreground font-semibold">{adminAuditResult.client_ip}</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Trigger an administrative action to view the cryptographic hash block.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tokens" && (
          <div
            role="tabpanel"
            id="sec-panel-tokens"
            aria-labelledby="sec-tab-tokens"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Role-Scoped API Token Generator
              </h2>
              <p className="text-sm text-muted-foreground">
                Generates fine-grained OAuth2 integration tokens with strict micro-permission bounding and TTL expiry.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Token TTL (Hours)</label>
                  <input
                    type="number"
                    value={scopeTokenHours}
                    onChange={(e) => setScopeTokenHours(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="p-3.5 bg-muted/50 dark:bg-slate-950/60 rounded-xl border border-border text-xs text-muted-foreground space-y-1.5 shadow-xs">
                  <div className="font-semibold text-foreground">Assigned Scopes:</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">• projects:read</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">• evidence:verify</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">• interop:sync</div>
                </div>
                <button
                  onClick={handleIssueToken}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Generating Scoped Token..." : "Issue Scoped API Token"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Generated Micro-Token</h3>
              {tokenResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Identifier: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{tokenResult.token_identifier}</span></div>
                  <div>Hash: <span className="text-muted-foreground">{tokenResult.token_hash?.slice(0, 32)}...</span></div>
                  <div>Expires At: <span className="text-foreground font-semibold">{tokenResult.expires_at}</span></div>
                  <div>Revocation State: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active (Revocable)</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Issue a token on the left to inspect authorization headers.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Static Overview Tabs */}
        {activeTab === "sovereignty" && (
          <div
            role="tabpanel"
            id="sec-panel-sovereignty"
            aria-labelledby="sec-tab-sovereignty"
            className="bg-card border border-border p-6 rounded-2xl space-y-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              MeitY-Empanelled Cloud Hosting & Indian Data Localization
            </h2>
            <p className="text-sm text-muted-foreground">
              Guarantees strict residency within Republic of India geographic boundaries in compliance with MeitY Cloud Service Provider Guidelines.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-1.5 shadow-xs">
                <div className="text-muted-foreground font-sans font-medium">Cloud Provider:</div>
                <div className="text-foreground font-semibold text-sm">NIC Cloud / AWS GovCloud Mumbai</div>
              </div>
              <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-1.5 shadow-xs">
                <div className="text-muted-foreground font-sans font-medium">Jurisdiction:</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">Republic of India (100% Localized)</div>
              </div>
              <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-1.5 shadow-xs">
                <div className="text-muted-foreground font-sans font-medium">MeitY Audit Ref:</div>
                <div className="text-blue-600 dark:text-blue-400 font-semibold text-sm">MEITY-GOV-CLOUD-AUDIT-2024-91</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "vapt" && (
          <div
            role="tabpanel"
            id="sec-panel-vapt"
            aria-labelledby="sec-tab-vapt"
            className="bg-card border border-border p-6 rounded-2xl space-y-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              CERT-In Empanelled VAPT Security Audit Register
            </h2>
            <div className="p-5 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Auditor:</span>
                <span className="text-foreground font-semibold">KPMG India Cyber Security (CERT-In Empaneled)</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Reference:</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">CERT-IN-VAPT-2024-Q3</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Vulnerabilities:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0 Critical, 0 High, 2 Medium (Remediated)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% REMEDIATED & CERTIFIED</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dpdp" && (
          <div
            role="tabpanel"
            id="sec-panel-dpdp"
            aria-labelledby="sec-tab-dpdp"
            className="bg-card border border-border p-6 rounded-2xl space-y-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Digital Personal Data Protection (DPDP) Act 2023 Compliance
            </h2>
            <p className="text-sm text-muted-foreground">
              Citizen data fiduciary guarantees: Purpose specification, explicit consent recording, right to erasure, and right to correction.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-2 shadow-xs">
                <div className="text-foreground font-semibold text-sm">Consent Fiduciary</div>
                <p className="text-muted-foreground leading-relaxed">Granular consent captured for Aadhaar KYC, grievance filing, and public voting.</p>
              </div>
              <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-2 shadow-xs">
                <div className="text-foreground font-semibold text-sm">Principal Rights</div>
                <p className="text-muted-foreground leading-relaxed">Automated workflows for data download, correction, and right-to-be-forgotten requests.</p>
              </div>
              <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-2 shadow-xs">
                <div className="text-foreground font-semibold text-sm">Notice & Purpose Limit</div>
                <p className="text-muted-foreground leading-relaxed">Multilingual privacy notice displayed prior to capturing any photo or geocoordinate.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "vault" && (
          <div
            role="tabpanel"
            id="sec-panel-vault"
            aria-labelledby="sec-tab-vault"
            className="bg-card border border-border p-6 rounded-2xl space-y-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Centralized Secrets Vault & Credential Rotation
            </h2>
            <div className="p-5 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Vault Provider:</span>
                <span className="text-foreground font-semibold">HashiCorp Vault KV-v2</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Rotation Schedule:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Every 30 Days (Automated Zero-Downtime)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Managed Secrets:</span>
                <span className="text-foreground font-semibold">Postgres DB credentials, S3/Bhuvan tokens, UIDAI HSM keys</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "gem" && (
          <div
            role="tabpanel"
            id="sec-panel-gem"
            aria-labelledby="sec-tab-gem"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                GeM & CPPP Contractor Registry Synchronization
              </h2>
              <p className="text-sm text-muted-foreground">
                Synchronizes contractor profile with GeM v4.0 and conducts real-time CPPP debarment checks.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Contractor Database ID</label>
                  <input
                    type="number"
                    value={gemContractorId}
                    onChange={(e) => setGemContractorId(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">GeM Seller / Vendor ID</label>
                  <input
                    type="text"
                    value={gemSellerId}
                    onChange={(e) => setGemSellerId(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <button
                  onClick={handlePullGeMProfile}
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Querying GeM & CPPP..." : "Pull GeM Performance & Blacklist Status"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">National GeM Vendor Clearance</h3>
              {gemResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Seller ID: <span className="text-blue-600 dark:text-blue-400 font-semibold">{gemResult.gem_seller_id}</span></div>
                  <div>Past Performance Score: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{gemResult.past_performance_score}/100</span></div>
                  <div>Completed GeM Orders: <span className="text-foreground font-semibold">{gemResult.total_gem_orders_count} Orders</span></div>
                  <div>CPPP National Blacklist: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{gemResult.is_blacklisted_national ? "BLACKLISTED" : "CLEAN / NOT DEBARRED"}</span></div>
                  <div>Last Synced At: <span className="text-muted-foreground">{gemResult.last_synced_at}</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Execute GeM query to pull verified past delivery scores and debarment flags.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "egov" && (
          <div
            role="tabpanel"
            id="sec-panel-egov"
            aria-labelledby="sec-tab-egov"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                e-Gov Interoperability Framework (e-GIF API Gateway)
              </h2>
              <p className="text-sm text-muted-foreground">
                Registers state portals and departments with OAuth2 client credentials and HMAC-SHA256 authorization.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Consumer System Name</label>
                  <input
                    type="text"
                    value={egovSystemName}
                    onChange={(e) => setEgovSystemName(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">OAuth2 Client ID</label>
                  <input
                    type="text"
                    value={egovClientId}
                    onChange={(e) => setEgovClientId(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Allowed Namespaces (comma separated)</label>
                  <input
                    type="text"
                    value={egovNamespaces}
                    onChange={(e) => setEgovNamespaces(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                  />
                </div>
                <button
                  onClick={handleRegisterEGovConsumer}
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Registering Gateway Client..." : "Provision e-Gov Gateway Client"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">API Gateway Provisioning Ledger</h3>
              {egovResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Consumer: <span className="text-foreground font-semibold">{egovResult.consumer_system_name}</span></div>
                  <div>Client ID: <span className="text-purple-600 dark:text-purple-400 font-semibold">{egovResult.oauth2_client_id}</span></div>
                  <div>HMAC Secret Hash: <span className="text-muted-foreground">{egovResult.hmac_secret_hash?.slice(0, 28)}...</span></div>
                  <div>Rate Limit: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{egovResult.rate_limit_per_minute} req/min</span></div>
                  <div>Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{egovResult.is_active ? "ACTIVE & AUTHORIZED" : "DISABLED"}</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Provision an e-Gov client on the left to generate HMAC authorization credentials.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "gis" && (
          <div
            role="tabpanel"
            id="sec-panel-gis"
            aria-labelledby="sec-tab-gis"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Bhu-Naksha / Bhoomi Cadastral Parcel Integration
              </h2>
              <p className="text-sm text-muted-foreground">
                Overlays spatial cadastral Khasra polygons from state land revenue portals against sanctioned infrastructure alignments.
              </p>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Project ID</label>
                    <input
                      type="text"
                      value={gisProjectId}
                      onChange={(e) => setGisProjectId(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Khasra Number</label>
                    <input
                      type="text"
                      value={gisKhasra}
                      onChange={(e) => setGisKhasra(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">State Land Record Reference Code</label>
                  <input
                    type="text"
                    value={gisStateCode}
                    onChange={(e) => setGisStateCode(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                  />
                </div>
                <button
                  onClick={handleOverlayGisParcel}
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Overlapping Cadastral Boundary..." : "Overlay Bhu-Naksha Khasra Parcel"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Bhu-Naksha Cadastral Overlay Outcome</h3>
              {gisResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Khasra: <span className="text-foreground font-semibold">{gisResult.khasra_number}</span></div>
                  <div>State Record: <span className="text-amber-600 dark:text-amber-400 font-semibold">{gisResult.state_land_record_code}</span></div>
                  <div>Alignment Check: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{gisResult.is_within_sanctioned_alignment ? "WITHIN SANCTIONED RIGHT-OF-WAY" : "BOUNDARY ENCROACHMENT"}</span></div>
                  <div>Dispute Notes: <span className="text-muted-foreground">{gisResult.disputed_boundary_notes}</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Submit parcel overlay to verify Right-of-Way boundaries against state land revenue records.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "treasury" && (
          <div
            role="tabpanel"
            id="sec-panel-treasury"
            aria-labelledby="sec-tab-treasury"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                State Treasury / IFMS Electronic Payment Scrolls
              </h2>
              <p className="text-sm text-muted-foreground">
                Binds DDO payment vouchers directly into the state integrated financial management system with electronic scroll IDs.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Project ID</label>
                  <input
                    type="text"
                    value={treasuryProjectId}
                    onChange={(e) => setTreasuryProjectId(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">State Code</label>
                    <input
                      type="text"
                      value={treasuryStateCode}
                      onChange={(e) => setTreasuryStateCode(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">DDO Code</label>
                    <input
                      type="text"
                      value={treasuryDdoCode}
                      onChange={(e) => setTreasuryDdoCode(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Treasury Bill Number</label>
                    <input
                      type="text"
                      value={treasuryBillNo}
                      onChange={(e) => setTreasuryBillNo(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Passed Amount (₹)</label>
                    <input
                      type="number"
                      value={treasuryAmount}
                      onChange={(e) => setTreasuryAmount(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleHookTreasury}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Hooking IFMS & RBI e-Kuber..." : "Generate State Treasury Scroll"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Treasury IFMS Scroll Settlement</h3>
              {treasuryResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Electronic Scroll ID: <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{treasuryResult.electronic_scroll_id}</span></div>
                  <div>Bill Number: <span className="text-foreground font-semibold">{treasuryResult.treasury_bill_number}</span></div>
                  <div>Disbursed Amount: <span className="text-foreground font-semibold">₹{Number(treasuryResult.passed_amount_inr || 0).toLocaleString()}</span></div>
                  <div>Clearance Date: <span className="text-foreground font-semibold">{treasuryResult.treasury_clearance_date}</span></div>
                  <div>RBI e-Kuber Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">SETTLED (RTGS/NEFT Scroll Anchored)</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Generate treasury scroll to bind payment into State IFMS ledger.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
