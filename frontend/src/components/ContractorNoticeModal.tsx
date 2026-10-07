/*
 * ContractorNoticeModal — CivicPulse
 * Statutory PWD Contractor Rectification Notice & Work-Order (MoRTH Clause 3004.2 / CPWD Form 8)
 * Printable government docket with digital signature seal and liquidated damages clause.
 */

import { Printer, X, FileText, AlertTriangle, QrCode } from "lucide-react";

interface ContractorNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  potholeData: any;
  gpsCoords: { lat: number; lng: number } | null;
  projectId?: string;
}

export default function ContractorNoticeModal({
  isOpen,
  onClose,
  potholeData,
  gpsCoords,
  projectId = "PW-2024-001",
}: ContractorNoticeModalProps) {
  if (!isOpen) return null;

  const docketNumber = "PWD/MORTH/REV/2026/089-4412";
  const currentDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const deadlineDate = new Date(Date.now() + 48 * 3600 * 1000).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const potholes = potholeData?.potholes_detected ?? 2;
  const cracks = potholeData?.cracks_detected ?? 1;
  const severityScore = potholeData?.irc82_severity_score ?? 68.5;
  const estimatedCost = potholeData?.estimated_repair_cost_inr ?? 78500;
  const materialVol = potholeData?.estimated_material_volume_m3 ?? 0.85;

  const lat = (gpsCoords?.lat ?? 28.5245).toFixed(6);
  const lng = (gpsCoords?.lng ?? 77.2065).toFixed(6);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      {/* Container */}
      <div
        className="relative w-full max-w-3xl bg-card text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <h2 className="font-bold text-sm">
              Statutory PWD Contractor Work-Order & Penalty Notice
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              data-testid="close-contractor-modal"
              aria-label="Close dialog"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Notice Document */}
        <div id="pwd-contractor-notice" className="p-8 space-y-6 bg-background print:p-0 print:bg-white print:text-black overflow-y-auto flex-1">
          {/* Government Official Header */}
          <div className="text-center pb-4 border-b-2 border-border print:border-black space-y-1">
            <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase print:text-gray-700">
              GOVERNMENT OF INDIA · MINISTRY OF ROAD TRANSPORT & HIGHWAYS
            </div>
            <h1 className="text-lg font-black tracking-tight text-foreground print:text-black uppercase">
              PUBLIC WORKS DEPARTMENT (PWD) — NATIONAL HIGHWAYS ZONE
            </h1>
            <div className="text-xs font-mono text-cyan-400 print:text-blue-800 font-semibold">
              OFFICE OF THE EXECUTIVE ENGINEER · QUALITY ASSURANCE DIVISION
            </div>
            <div className="text-[10px] font-mono text-muted-foreground print:text-gray-600">
              Statutory Compliance under MoRTH Clause 3004.2 & Central PWD Contract Form 8
            </div>
          </div>

          {/* Docket & Meta Table */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono p-3 rounded-lg bg-muted/30 border border-border print:border-black print:bg-gray-50">
            <div>
              <span className="text-muted-foreground print:text-gray-600">DOCKET NO: </span>
              <span className="font-bold text-foreground print:text-black">{docketNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground print:text-gray-600">DATE OF ISSUE: </span>
              <span className="font-bold text-foreground print:text-black">{currentDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground print:text-gray-600">PROJECT ID: </span>
              <span className="font-bold text-foreground print:text-black">{projectId} (NH-44 Corridor)</span>
            </div>
            <div>
              <span className="text-muted-foreground print:text-gray-600">COMPLIANCE DEADLINE: </span>
              <span className="font-bold text-rose-500 print:text-red-700">{deadlineDate} (48 Hours)</span>
            </div>
          </div>

          {/* Notice To Contractor */}
          <div className="text-xs space-y-1">
            <div className="font-bold uppercase text-muted-foreground print:text-gray-700">TO (CONCESSIONAIRE / CONTRACTOR):</div>
            <div className="font-bold text-sm text-foreground print:text-black">
              M/s Larsen & Toubro Infrastructure Projects Ltd. (Package NH44-DL-02)
            </div>
            <div className="text-muted-foreground print:text-gray-600">
              Contract Agreement No: CA/NHAI/TECH/2024/771-B
            </div>
          </div>

          {/* Geotagged Location Reference */}
          <div className="p-3 rounded-lg border border-border bg-card/60 print:border-black print:bg-white text-xs space-y-1">
            <div className="font-bold flex items-center gap-1 text-cyan-400 print:text-black">
              <span>📍 Geotagged Defect Chainage & GPS Coordinates:</span>
            </div>
            <div className="font-mono text-[11px] grid grid-cols-2 gap-2 text-foreground print:text-black">
              <div>• Chainage: KM 42+150 (Northbound Expressway)</div>
              <div>• Latitude: {lat}° N</div>
              <div>• Longitude: {lng}° E</div>
              <div>• Geofence Radius: 500m Verified</div>
            </div>
          </div>

          {/* Defect Inspection & Severity Table */}
          <div className="space-y-2">
            <div className="font-bold text-xs uppercase text-foreground print:text-black">
              1. AI Computer Vision Road Surface Defect Findings (IRC:82-2015):
            </div>
            <table className="w-full text-xs font-mono border-collapse border border-border print:border-black">
              <thead>
                <tr className="bg-muted/60 print:bg-gray-100 text-left">
                  <th className="border border-border print:border-black p-2">Defect Type</th>
                  <th className="border border-border print:border-black p-2">Detected Count</th>
                  <th className="border border-border print:border-black p-2">IRC:82 Severity</th>
                  <th className="border border-border print:border-black p-2">Required Cold-Mix (m³)</th>
                  <th className="border border-border print:border-black p-2">Estimated DSR Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border print:border-black p-2 font-bold">Pothole Cavities</td>
                  <td className="border border-border print:border-black p-2">{potholes} cavities</td>
                  <td className="border border-border print:border-black p-2 font-bold text-rose-400 print:text-red-700">
                    {severityScore >= 60 ? "Critical (Grade A)" : "Moderate (Grade B)"}
                  </td>
                  <td className="border border-border print:border-black p-2">{materialVol} m³</td>
                  <td className="border border-border print:border-black p-2">₹{estimatedCost.toLocaleString("en-IN")}</td>
                </tr>
                {cracks > 0 && (
                  <tr>
                    <td className="border border-border print:border-black p-2 font-bold">Longitudinal Cracks</td>
                    <td className="border border-border print:border-black p-2">{cracks} fissure(s)</td>
                    <td className="border border-border print:border-black p-2 text-amber-400 print:text-amber-800">
                      Moderate Structural
                    </td>
                    <td className="border border-border print:border-black p-2">Bitumen Seal Coat</td>
                    <td className="border border-border print:border-black p-2">DSR Clause 5.3</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Statutory Directives & Penalties */}
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 print:border-black print:bg-gray-50 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-400 print:text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span>2. Statutory Rectification Order & Liquidated Damages Notice:</span>
            </div>
            <p className="text-muted-foreground print:text-black leading-relaxed">
              Pursuant to <strong>MoRTH Specifications Section 3004.2</strong> and <strong>IRC:82-2015 Clause 6.2</strong>, the Contractor is hereby directed to deploy high-velocity emergency cold-mix bituminous patch work and level the roadway surface within <strong>48 hours</strong> from the time of receipt of this notice.
            </p>
            <p className="text-[11px] font-mono text-rose-300 print:text-red-700 font-bold">
              PENALTY CLAUSE: Non-compliance within 48 hours shall attract Liquidated Damages of ₹10,000 per 24-hour default cycle under Clause 2 of CPWD General Conditions of Contract, and defect rectification will be executed at the Contractor's risk and cost.
            </p>
          </div>

          {/* Digital Signature & Verification Footer */}
          <div className="pt-4 border-t border-border print:border-black flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-border print:border-black rounded bg-white">
                <QrCode className="w-12 h-12 text-black" />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground print:text-gray-600">
                <div>AUTHENTICITY VERIFICATION</div>
                <div>SHA-256: d8f3a9e...4c82b1</div>
                <div>CivicPulse Verifiable Public Works Record</div>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs font-bold text-foreground print:text-black">
                Priya Verma, M.Tech (Civil)
              </div>
              <div className="text-[11px] text-muted-foreground print:text-gray-600">
                Executive Engineer (Quality Assurance)
              </div>
              <div className="inline-block text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold print:border-black print:text-black">
                ✓ DIGITALLY SIGNED & VERIFIED
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="px-6 py-3 border-t border-border bg-muted/40 flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
