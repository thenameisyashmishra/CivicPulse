/*
 * Settings — CivicPulse
 * System configuration, notification preferences, AI model settings,
 * and DigiLocker Aadhaar Verification.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Bell, Bot, Database, CheckCircle, Fingerprint, Lock, HelpCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getSavedUser, verifyAadhaar, changePassword, requestPasswordReset, verifyPasswordReset } from "@/lib/data";

export default function Settings() {
  const [user, setUser] = useState(getSavedUser());

  // Notifications
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    budgetOverrun: true,
    verificationComplete: true,
    weeklyDigest: false,
  });

  // AI settings
  const [aiSettings, setAiSettings] = useState({
    model: "gpt-4-vision",
    confidenceThreshold: 75,
    autoVerify: true,
    manualReviewRequired: false,
  });

  // DigiLocker Modal states
  const [showModal, setShowModal] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Aadhaar & Consent, 2: OTP Entry, 3: Success
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Security Credentials states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Password reset wizard states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMfaCode, setResetMfaCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetNew, setShowResetNew] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email request, 2: OTP verification + change
  const [simulatedResetCode, setSimulatedResetCode] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setUpdatingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Profile credentials updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResettingPassword(true);
    try {
      const res = await requestPasswordReset(resetEmail);
      setSimulatedResetCode(res.simulated_mfa_code);
      setResetStep(2);
      toast.success("Simulated MFA code dispatched to mail logs!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset request failed");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResetVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    setResettingPassword(true);
    try {
      await verifyPasswordReset(resetEmail, resetMfaCode, resetNewPassword);
      toast.success("Password reset verified and completed!");
      setShowResetModal(false);
      setResetEmail("");
      setResetMfaCode("");
      setResetNewPassword("");
      setResetStep(1);
      setSimulatedResetCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleStartVerification = () => {
    setModalStep(1);
    setAadhaarNumber("");
    setConsentGiven(false);
    setOtpCode("");
    setShowModal(true);
  };

  const handleAadhaarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aadhaarNumber.length !== 12 || !/^\d+$/.test(aadhaarNumber)) {
      toast.error("Please enter a valid 12-digit Aadhaar number");
      return;
    }
    if (!consentGiven) {
      toast.error("Please accept the DigiLocker consent checkbox");
      return;
    }
    setVerifying(true);
    // Simulate sending OTP SMS
    setTimeout(() => {
      setVerifying(false);
      setModalStep(2);
      toast.info("Security OTP sent to registered mobile ending in xxxx");
    }, 1200);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      toast.error("Please enter a valid 6-digit OTP code");
      return;
    }
    setVerifying(true);
    try {
      const updatedUser = await verifyAadhaar(aadhaarNumber, otpCode);
      setUser(updatedUser);
      setModalStep(3);
      toast.success("Aadhaar identity verified via DigiLocker");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
            SYSTEM SETTINGS
          </h1>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
            Configure monitoring parameters and manage verified identities
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DigiLocker Identity Card */}
          <div className="bg-card border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Fingerprint size={14} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                DIGILOCKER IDENTITY VAULT
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Lock size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    Aadhaar Status
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    National ID authentication via Gov DigiLocker OAuth portal. Verified accounts prevent citizen audit duplication and build structural trust.
                  </p>
                </div>
              </div>

              {user?.aadhaar_verified ? (
                <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold block" style={{ fontFamily: "var(--font-mono)" }}>
                      ✓ IDENTITY LINKED & VERIFIED
                    </span>
                    <span className="text-[11px] text-foreground mt-0.5 block" style={{ fontFamily: "var(--font-mono)" }}>
                      Aadhaar ending in: xxxx-xxxx-{user.aadhaar_last_4}
                    </span>
                  </div>
                  <CheckCircle className="text-emerald-400" size={24} />
                </div>
              ) : (
                <div className="border border-rose-500/20 bg-rose-500/5 p-4 flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] text-rose-400 font-bold block" style={{ fontFamily: "var(--font-mono)" }}>
                      ⚠ IDENTITY UNLINKED
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      Aadhaar verification is required to participate in project audits and vote.
                    </span>
                  </div>
                  <button
                    onClick={handleStartVerification}
                    className="self-start px-3.5 py-1.5 bg-primary/10 border border-primary/40 text-primary text-xs hover:bg-primary/20 transition-colors font-semibold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    LINK AADHAAR NOW
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Model */}
          <div className="bg-card border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Bot size={14} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                AI CONFIGURATION
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase block mb-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                  Vision Model
                </label>
                <select
                  value={aiSettings.model}
                  onChange={(e) => {
                    setAiSettings({ ...aiSettings, model: e.target.value });
                    toast.success("Model updated");
                  }}
                  className="w-full bg-background border border-border text-xs text-foreground px-3 py-2 outline-none focus:border-primary"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <option value="gpt-4-vision">GPT-4 Vision</option>
                  <option value="claude-vision">Claude 3 Vision</option>
                  <option value="gemini-vision">Gemini Pro Vision</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase block mb-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                  Confidence Threshold: {aiSettings.confidenceThreshold}%
                </label>
                <input
                  type="range"
                  min={50}
                  max={99}
                  value={aiSettings.confidenceThreshold}
                  onChange={(e) => setAiSettings({ ...aiSettings, confidenceThreshold: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                  <span>50%</span>
                  <span>99%</span>
                </div>
              </div>
              <ToggleSetting
                label="Auto-verify Low-Risk Items"
                description="Automatically approve verifications above threshold"
                enabled={aiSettings.autoVerify}
                onToggle={() => {
                  setAiSettings({ ...aiSettings, autoVerify: !aiSettings.autoVerify });
                  toast.success("Setting updated");
                }}
              />
              <ToggleSetting
                label="Require Manual Review"
                description="All AI decisions require human confirmation"
                enabled={aiSettings.manualReviewRequired}
                onToggle={() => {
                  setAiSettings({ ...aiSettings, manualReviewRequired: !aiSettings.manualReviewRequired });
                  toast.success("Setting updated");
                }}
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-card border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Bell size={14} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                NOTIFICATIONS
              </span>
            </div>
            <div className="p-5 space-y-4">
              <ToggleSetting
                label="Email Alerts"
                description="Receive email notifications for critical events"
                enabled={notifications.emailAlerts}
                onToggle={() => {
                  setNotifications({ ...notifications, emailAlerts: !notifications.emailAlerts });
                  toast.success("Setting updated");
                }}
              />
              <ToggleSetting
                label="Budget Overrun Alerts"
                description="Alert when project spend exceeds allocation"
                enabled={notifications.budgetOverrun}
                onToggle={() => {
                  setNotifications({ ...notifications, budgetOverrun: !notifications.budgetOverrun });
                  toast.success("Setting updated");
                }}
              />
              <ToggleSetting
                label="Verification Complete"
                description="Notify when AI verification finishes"
                enabled={notifications.verificationComplete}
                onToggle={() => {
                  setNotifications({ ...notifications, verificationComplete: !notifications.verificationComplete });
                  toast.success("Setting updated");
                }}
              />
              <ToggleSetting
                label="Weekly Digest"
                description="Summary report delivered every Monday"
                enabled={notifications.weeklyDigest}
                onToggle={() => {
                  setNotifications({ ...notifications, weeklyDigest: !notifications.weeklyDigest });
                  toast.success("Setting updated");
                }}
              />
            </div>
          </div>

          {/* Data */}
          <div className="bg-card border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Database size={14} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                DATA MANAGEMENT
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Export All Data</p>
                  <span className="text-[10px] text-muted-foreground">Download complete project database</span>
                </div>
                <button className="px-3 py-1.5 bg-muted/30 border border-border text-muted-foreground text-xs hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-mono)" }}>
                  EXPORT
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Archive Completed</p>
                  <span className="text-[10px] text-muted-foreground">Move completed projects to archive</span>
                </div>
                <button className="px-3 py-1.5 bg-muted/30 border border-border text-muted-foreground text-xs hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-mono)" }}>
                  ARCHIVE
                </button>
              </div>
            </div>
          </div>

          {/* Security Credentials & Reset */}
          <div className="cyber-card shadow-sm">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <KeyRound size={14} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                SECURITY & PASSWORD
              </span>
            </div>
            <div className="p-5 space-y-4">
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase block mb-1" style={{ fontFamily: "var(--font-mono)" }}>
                    Current Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-background border border-border text-xs text-foreground px-3 py-2 pr-9 outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground uppercase block mb-1" style={{ fontFamily: "var(--font-mono)" }}>
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-background border border-border text-xs text-foreground px-3 py-2 pr-9 outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground uppercase block mb-1" style={{ fontFamily: "var(--font-mono)" }}>
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-background border border-border text-xs text-foreground px-3 py-2 pr-9 outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep(1);
                      setResetEmail("");
                      setResetMfaCode("");
                      setResetNewPassword("");
                      setSimulatedResetCode("");
                      setShowResetModal(true);
                    }}
                    className="text-[10px] text-primary hover:underline uppercase font-semibold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-3.5 py-1.5 bg-primary/10 border border-primary/40 text-primary text-xs hover:bg-primary/20 transition-colors font-semibold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {updatingPassword ? "Saving..." : "UPDATE PASSWORD"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* DigiLocker Consent Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-[#161B22] border border-border border-t-4 border-t-amber-500 p-6 space-y-4 shadow-xl">
            
            {/* Header / Brand */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-amber-500 text-[10px] font-bold text-black flex items-center justify-center">DL</div>
                <span className="text-xs font-semibold text-foreground tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
                  DIGILOCKER CONSENT
                </span>
              </div>
              <HelpCircle size={14} className="text-muted-foreground cursor-pointer" />
            </div>

            {/* Step 1: Aadhaar and Consent */}
            {modalStep === 1 && (
              <form onSubmit={handleAadhaarSubmit} className="space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter your 12-digit UIDAI Aadhaar Number to retrieve authenticated profile credentials from your digital locker.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>Aadhaar Number (12 digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="xxxx-xxxx-xxxx"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none focus:border-amber-500"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    required
                    className="mt-0.5 accent-amber-500"
                  />
                  <label htmlFor="consent" className="text-[10px] text-muted-foreground leading-normal cursor-pointer select-none">
                    I authorize DigiLocker to share my identity documents (Aadhaar Card) with CivicPulse for accountability auditing.
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 bg-muted/40 border border-border text-muted-foreground text-xs hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="px-3 py-1.5 bg-amber-500 text-black text-xs hover:bg-amber-600 font-bold transition-colors"
                  >
                    {verifying ? "Sending OTP..." : "Get OTP →"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: OTP Entry */}
            {modalStep === 2 && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  A 6-digit verification code has been simulated and sent to your registered mobile ending in <strong>xxxx</strong>.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>Enter OTP (6 digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground tracking-[0.4em] text-center outline-none focus:border-amber-500 font-semibold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalStep(1)}
                    className="px-3 py-1.5 bg-muted/40 border border-border text-muted-foreground text-xs hover:text-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="px-3 py-1.5 bg-amber-500 text-black text-xs hover:bg-amber-600 font-bold transition-colors"
                  >
                    {verifying ? "Verifying..." : "Verify OTP →"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Screen */}
            {modalStep === 3 && (
              <div className="space-y-4 text-center py-2">
                <CheckCircle className="text-emerald-400 mx-auto" size={48} />
                <div>
                  <h3 className="text-xs font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    VERIFICATION SUCCESSFUL
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                    Identity linked to Aadhaar: <strong>xxxx-xxxx-{aadhaarNumber.slice(-4)}</strong>. You can now cast audit votes on public-work projects.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-1.5 bg-emerald-500 text-black text-xs hover:bg-emerald-600 font-bold transition-colors"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Return to Settings
                </button>
              </div>
            )}

          </div>
        </div>
      )}
      {/* Password Reset Modal Popup */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-[#161B22] border border-border border-t-4 border-t-primary p-6 space-y-4 shadow-xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-primary" />
                <span className="text-xs font-semibold text-foreground tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
                  PASSWORD RESET WIZARD
                </span>
              </div>
            </div>

            {/* Step 1: Request code */}
            {resetStep === 1 && (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter your registered email address to receive a 6-digit Multi-Factor Verification code to securely reset your password.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@civicpulse.gov.in"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3 py-1.5 bg-muted/40 border border-border text-muted-foreground text-xs hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="px-3 py-1.5 bg-primary text-black text-xs hover:bg-primary-hover font-bold transition-colors"
                  >
                    {resettingPassword ? "Requesting..." : "Send Reset Code →"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Input code and new password */}
            {resetStep === 2 && (
              <form onSubmit={handleResetVerify} className="space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter the 6-digit MFA verification code sent to your email, and define your new secure password.
                </p>
                
                {simulatedResetCode && (
                  <div className="border border-primary/20 bg-primary/5 p-3 text-[10px] text-primary" style={{ fontFamily: "var(--font-mono)" }}>
                    <p className="font-bold">MFA EMAIL SIMULATION OUTPUT:</p>
                    <p className="mt-1">MFA reset code: <strong>{simulatedResetCode}</strong></p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>Verification Code (6 digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="••••••"
                    value={resetMfaCode}
                    onChange={(e) => setResetMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground tracking-[0.2em] text-center outline-none focus:border-primary font-semibold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>New Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showResetNew ? "text" : "password"}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none focus:border-primary pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNew(!showResetNew)}
                      className="absolute right-2 text-muted-foreground hover:text-foreground"
                    >
                      {showResetNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="px-3 py-1.5 bg-muted/40 border border-border text-muted-foreground text-xs hover:text-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="px-3 py-1.5 bg-primary text-black text-xs hover:bg-primary/20 font-bold transition-colors"
                  >
                    {resettingPassword ? "Verifying..." : "Reset Password →"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ToggleSetting({ label, description, enabled, onToggle }: { label: string; description: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-foreground">{label}</p>
        <span className="text-[10px] text-muted-foreground">{description}</span>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-9 h-5 transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <span
          style={enabled ? { transform: "translateX(18px)" } : { transform: "translateX(2px)" }}
        />
      </button>
    </div>
  );
}
