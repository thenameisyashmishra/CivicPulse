import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  MessageSquare,
  Smartphone,
  Mic,
  Cpu,
  HeartHandshake,
  Timer,
  FileCheck,
  Share2,
  Accessibility,
} from "lucide-react";
import { toast } from "sonner";

export default function CitizenEngagementPortal() {
  const [activeTab, setActiveTab] = useState<
    | "whatsapp"
    | "sms"
    | "voice"
    | "nlp"
    | "sentiment"
    | "sla"
    | "charter"
    | "umang"
    | "accessibility"
  >("whatsapp");

  // Form states
  const [waText, setWaText] = useState("सड़क में बहुत बड़ा गड्ढा है, तुरंत मरम्मत कराएं");
  const [waLog, setWaLog] = useState<any>(null);

  const [smsCmd, setSmsCmd] = useState("STATUS PW-2024-001");
  const [smsLog, setSmsLog] = useState<any>(null);

  const [voiceLog, setVoiceLog] = useState<any>(null);
  const [nlpText, setNlpText] = useState("ठेकेदार ने सड़क निर्माण के लिए रिश्वत की माँग की");
  const [nlpLog, setNlpLog] = useState<any>(null);

  const [accessibilityData, setAccessibilityData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/engagement/accessibility/manifest")
      .then((r) => r.json())
      .then((data) => setAccessibilityData(data))
      .catch(console.error);
  }, []);

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/engagement/whatsapp/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: "+919876543210",
          message_text: waText,
          language: "hi",
        }),
      });
      const data = await res.json();
      setWaLog(data);
      toast.success("WhatsApp message processed by bot!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/engagement/sms/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: "+919123456789",
          raw_sms: smsCmd,
        }),
      });
      const data = await res.json();
      setSmsLog(data);
      toast.success("SMS command parsed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSimulateVoice = async () => {
    try {
      const res = await fetch("/api/engagement/voice/grievance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          audio_path: "/audio/citizen_complaint_record_01.wav",
          duration_seconds: 18.2,
          language: "hi-IN",
        }),
      });
      const data = await res.json();
      setVoiceLog(data);
      toast.success("Speech-to-text Whisper transcription complete!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleClassifyNLP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/engagement/nlp/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grievance_id: 104,
          complaint_text: nlpText,
        }),
      });
      const data = await res.json();
      setNlpLog(data);
      toast.success("Complaint auto-routed to nodal department!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card/80 to-teal-950/20 border border-border shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-6 w-6 text-teal-400" />
              <h1 className="text-2xl font-bold tracking-wide">
                Citizen Engagement & Grievance Redressal Portal
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
                PILLAR B.6
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Inclusive access · Multilingual WhatsApp/IVR, SMS fallback, Whisper voice grievance, NLP auto-routing, UMANG integration, WCAG 2.1 AA
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin">
          {[
            { id: "whatsapp", label: "WhatsApp Bot", icon: MessageSquare },
            { id: "sms", label: "SMS Fallback", icon: Smartphone },
            { id: "voice", label: "Voice Grievance (Whisper)", icon: Mic },
            { id: "nlp", label: "NLP Auto-Routing", icon: Cpu },
            { id: "sentiment", label: "Regional Sentiment", icon: HeartHandshake },
            { id: "sla", label: "Grievance SLA Timers", icon: Timer },
            { id: "charter", label: "Citizen Charter", icon: FileCheck },
            { id: "umang", label: "UMANG Super-App", icon: Share2 },
            { id: "accessibility", label: "WCAG 2.1 Accessibility", icon: Accessibility },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 shrink-0 transition ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: WhatsApp Bot */}
        {activeTab === "whatsapp" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-teal-400" />
                  Multilingual WhatsApp Citizen Bot
                </h3>
                <p className="text-xs text-muted-foreground">
                  Processes citizen text, voice memos, and geotagged photos in Hindi and regional languages with zero app download.
                </p>
              </div>

              <form onSubmit={handleSendWhatsApp} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold">Simulate Inbound WhatsApp Message</label>
                  <input
                    type="text"
                    value={waText}
                    onChange={(e) => setWaText(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-teal-600 text-white"
                >
                  Send to CivicPulse Bot Engine
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Bot Parsing Result</h3>
              {waLog ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>ID: {waLog.wa_message_id}</span>
                    <span className="text-teal-400 uppercase">{waLog.intent}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sender: SHA-256 Protected ({waLog.sender_phone_hash.slice(0, 12)}...)
                  </div>
                  <div className="text-teal-400 pt-1">
                    Language: {waLog.language} · Direction: {waLog.direction}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Simulate WhatsApp message.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: SMS Fallback */}
        {activeTab === "sms" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-teal-400" />
                  SMS & Feature-Phone 2G Fallback
                </h3>
                <p className="text-xs text-muted-foreground">
                  Enables citizens with basic feature phones to query project progress and file defects via plain SMS shortcode.
                </p>
              </div>

              <form onSubmit={handleSendSMS} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold">SMS Command (e.g., STATUS PW-2024-001)</label>
                  <input
                    type="text"
                    value={smsCmd}
                    onChange={(e) => setSmsCmd(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-teal-600 text-white"
                >
                  Send Shortcode SMS
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">GSM-7 Response Payload</h3>
              {smsLog ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>Command: {smsLog.parsed_command}</span>
                    <span className="text-emerald-400 uppercase">{smsLog.delivery_status}</span>
                  </div>
                  <div className="p-2 rounded bg-background border border-border text-[11px] text-teal-300">
                    "{smsLog.response_sms}"
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Send SMS shortcode.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Voice Grievance */}
        {activeTab === "voice" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Mic className="h-4 w-4 text-teal-400" />
                  Voice-Based Grievance Filing (Whisper ASR)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Converts recorded rural voice calls and audio notes into indexed, actionable text for non-literate citizens.
                </p>
              </div>

              <button
                onClick={handleSimulateVoice}
                className="w-full py-2 font-semibold rounded-lg bg-teal-600 text-white text-xs"
              >
                Transcribe Rural Voice Memo (Hindi)
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Whisper Neural Transcription</h3>
              {voiceLog ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>Lang: {voiceLog.detected_language}</span>
                    <span className="text-emerald-400">
                      {(voiceLog.transcription_confidence * 100).toFixed(1)}% CONFIDENCE
                    </span>
                  </div>
                  <p className="p-2 rounded bg-background border border-border text-[11px]">
                    "{voiceLog.transcribed_text}"
                  </p>
                  <div className="text-[10px] text-muted-foreground">
                    Duration: {voiceLog.audio_duration_seconds}s
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Transcribe voice memo.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: NLP Routing */}
        {activeTab === "nlp" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-teal-400" />
                  NLP Complaint Categorization & Routing
                </h3>
                <p className="text-xs text-muted-foreground">
                  Multiclass intent classifier automatically tags complaints and routes them directly to the appropriate executive division.
                </p>
              </div>

              <form onSubmit={handleClassifyNLP} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold">Grievance Narrative</label>
                  <textarea
                    rows={3}
                    value={nlpText}
                    onChange={(e) => setNlpText(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-teal-600 text-white"
                >
                  Classify & Auto-Route
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Classification & Destination</h3>
              {nlpLog ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-2">
                  <div className="flex justify-between font-bold">
                    <span className="uppercase text-rose-400">{nlpLog.predicted_category}</span>
                    <span className="text-teal-400">
                      {(nlpLog.classification_confidence * 100).toFixed(1)}% CONFIDENCE
                    </span>
                  </div>
                  <div className="p-2 rounded bg-background border border-border text-[11px] text-teal-300 font-bold">
                    Routed To: {nlpLog.routed_department}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Classify complaint.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Regional Sentiment */}
        {activeTab === "sentiment" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Citizen Sentiment Analysis Across Panchayats</h3>
              <p className="text-xs text-muted-foreground">
                Aggregates public feedback across wards to evaluate civic satisfaction (-1.0 to +1.0).
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2 text-xs font-mono">
                <div className="flex justify-between font-bold">
                  <span>North East Delhi · Karawal Nagar</span>
                  <span className="text-emerald-400">+0.68 POSITIVE</span>
                </div>
                <div className="w-full bg-accent/30 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: "82%" }} />
                </div>
                <div className="text-muted-foreground text-[10px]">
                  82% Positive · 14% Negative · 142 Citizen Inputs
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2 text-xs font-mono">
                <div className="flex justify-between font-bold">
                  <span>Shahdara · Dilshad Garden</span>
                  <span className="text-emerald-400">+0.56 POSITIVE</span>
                </div>
                <div className="w-full bg-accent/30 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: "78%" }} />
                </div>
                <div className="text-muted-foreground text-[10px]">
                  78% Positive · 22% Negative · 98 Citizen Inputs
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Grievance SLA */}
        {activeTab === "sla" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Designated Officer Grievance Assignment & SLA Timers</h3>
              <p className="text-xs text-muted-foreground">
                Enforces statutory 15-day resolution deadlines under the Right to Public Services Act with automatic escalation to Executive Engineers.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Grievance #101: Pavement Joint Separation</span>
                <span className="text-emerald-400">SLA ACTIVE (8 DAYS REMAINING)</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Assigned Officer: Priya Verma (Executive Engineer) · Escalation Tier: Tier-1 (Pre-breach)
              </p>
            </div>
          </div>
        )}

        {/* Tab 7: Citizen Charter */}
        {activeTab === "charter" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Citizen Charter Statutory Service-Level Compliance</h3>
              <p className="text-xs text-muted-foreground">
                Tracks statutory turnaround times against citizen charter mandates across all civic departments.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Public Works Department (PWD) — Pothole Repair</span>
                <span className="text-emerald-400">94.2% CHARTER COMPLIANCE</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Statutory Target: 7 Days · Actual Average: 4.8 Days · Performance: Excellent
              </p>
            </div>
          </div>
        )}

        {/* Tab 8: UMANG App */}
        {activeTab === "umang" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">National UMANG Super-App Integration Gateway</h3>
              <p className="text-xs text-muted-foreground">
                Publishes CivicPulse project transparency and grievance APIs directly into the Government of India UMANG super-app.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Service: UMANG-CIVICPULSE-V1</span>
                <span className="text-emerald-400">ACTIVE ON UMANG GATEWAY</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Endpoint: /api/transparency/public/projects · Total API Calls Handled: 4,820 · JSON-LD Format
              </div>
            </div>
          </div>
        )}

        {/* Tab 9: Accessibility */}
        {activeTab === "accessibility" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">WCAG 2.1 Level AA Accessibility & Voice Navigation</h3>
              <p className="text-xs text-muted-foreground">
                Full adherence to GIGW (Guidelines for Indian Government Websites) and WCAG 2.1 AA with regional voice navigation triggers.
              </p>
            </div>

            {accessibilityData && (
              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
                <div className="flex justify-between font-bold">
                  <span>Standard: {accessibilityData.standards_compliance}</span>
                  <span className="text-emerald-400">100% ALT-TEXT & ARIA COMPLIANT</span>
                </div>
                <div className="space-y-1 text-[11px] pt-2">
                  <div className="font-bold text-teal-300">Registered Regional Voice Triggers:</div>
                  {accessibilityData.voice_navigation_commands?.map((cmd: any, i: number) => (
                    <div key={i} className="text-muted-foreground">
                      • "{cmd.trigger}" ➔ <span className="text-teal-400">{cmd.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
