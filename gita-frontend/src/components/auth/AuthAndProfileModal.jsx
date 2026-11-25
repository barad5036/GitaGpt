import { useState } from "react";
import {
  Mail,
  KeyRound,
  Trash2,
  LogOut,
  ArrowLeft,
  X
} from "lucide-react";
import {
  setSessionInMemory,
  getAccessTokenInMemory,
  clearSessionInMemory
} from "../../services/webCryptoCache.js";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function AuthAndProfileModal({
  isOpen,
  isMandatoryGate = false,
  onClose,
  currentUser,
  onUserChange,
  onOpenLegalModal,
  onWipeLocalData,
  onToast
}) {
  const [step, setStep] = useState("choice"); // "choice" | "google" | "otp"
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen && !isMandatoryGate) return null;

  const completeLogin = (userObj, token = "local_session_token") => {
    setSessionInMemory(token, userObj);
    try {
      sessionStorage.setItem("gitagpt:active_user:v1", JSON.stringify(userObj));
    } catch {
      // ignore
    }
    onUserChange(userObj);
    setStep("choice");
    onToast?.(`Welcome, ${userObj.name}`);
    onClose?.();
  };

  const handleGoogleContinue = async (e) => {
    e?.preventDefault?.();
    setErrorMsg("");

    if (step !== "google") {
      setStep("google");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg("Please enter a valid Google email address.");
      return;
    }

    const displayName = name.trim() || cleanEmail.split("@")[0];
    setBusy(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: displayName })
      });
      const data = await res.json();
      if (res.ok && data?.user) {
        completeLogin(data.user, data.accessToken);
        return;
      }
    } catch {
      // Standalone mobile APK fallback when local server is not running on phone
    } finally {
      setBusy(false);
    }

    completeLogin({
      id: `u_${Date.now()}`,
      email: cleanEmail,
      name: displayName
    });
  };

  const handleRequestEmailOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/email/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      if (res.ok && data?.devOtpCode) {
        setDevOtpHint(data.devOtpCode);
        setStep("otp");
        return;
      }
    } catch {
      // Standalone mobile APK OTP generation
    } finally {
      setBusy(false);
    }

    const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    setDevOtpHint(generatedCode);
    setStep("otp");
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const cleanEmail = email.trim().toLowerCase();
    const displayName = name.trim() || cleanEmail.split("@")[0];

    setBusy(true);
    try {
      const res = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: otpCode.trim(),
          name: displayName
        })
      });
      const data = await res.json();
      if (res.ok && data?.user) {
        completeLogin(data.user, data.accessToken);
        return;
      }
    } catch {
      // Standalone mobile APK OTP check
    } finally {
      setBusy(false);
    }

    if (otpCode.trim() === devOtpHint) {
      completeLogin({
        id: `u_${Date.now()}`,
        email: cleanEmail,
        name: displayName
      });
    } else {
      setErrorMsg("Invalid verification code. Please check the 6-digit code.");
    }
  };

  const handleLogout = async () => {
    const token = getAccessTokenInMemory();
    setBusy(true);
    try {
      if (token && token !== "local_session_token") {
        await fetch("/api/auth/logout-all", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
      clearSessionInMemory();
      try {
        sessionStorage.removeItem("gitagpt:active_user:v1");
      } catch {
        // ignore
      }
      onUserChange(null);
      onToast?.("Signed out");
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMyAccount = async () => {
    const token = getAccessTokenInMemory();
    setBusy(true);
    try {
      if (token && token !== "local_session_token") {
        await fetch("/api/privacy/account", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
      clearSessionInMemory();
      try {
        sessionStorage.removeItem("gitagpt:active_user:v1");
      } catch {
        // ignore
      }
      onUserChange(null);
      onWipeLocalData?.();
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={
        isMandatoryGate
          ? { background: "var(--bg-main)", backdropFilter: "none" }
          : undefined
      }
      role="dialog"
      aria-modal="true"
      aria-label={currentUser ? "Account" : "Sign in to GitaGPT"}
      onClick={isMandatoryGate ? undefined : onClose}
    >
      <div
        className="modal-card"
        style={{ maxWidth: 400, padding: "28px 24px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button (hidden when login is mandatory before chatting) */}
        {!isMandatoryGate && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="icon-btn"
              aria-label="Close"
              onClick={onClose}
              style={{ margin: "-6px -6px 0 0" }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: 22
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid var(--border-strong)",
              marginBottom: 14,
              boxShadow: "0 10px 28px rgba(245, 158, 11, 0.22)"
            }}
          >
            <img
              src="/logo.png"
              alt="GitaGPT"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: "1.3rem", fontWeight: 600 }}>
            {currentUser ? "Your Account" : "Welcome to GitaGPT"}
          </h3>
          {!currentUser && (
            <p
              style={{
                margin: 0,
                fontSize: "0.86rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5
              }}
            >
              Log in to start chatting with your Bhagavad Gita companion.
            </p>
          )}
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#ef4444",
              fontSize: "0.82rem",
              marginBottom: 14,
              textAlign: "center"
            }}
          >
            {errorMsg}
          </div>
        )}

        {currentUser ? (
          /* Signed-In Profile View */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                padding: "14px",
                borderRadius: 12,
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 4
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--peacock-soft)",
                  border: "1px solid var(--border-peacock)",
                  color: "var(--accent-peacock)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1rem"
                }}
              >
                {currentUser.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.94rem" }}>
                  {currentUser.name}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {currentUser.email}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="voice-pack-option"
              onClick={handleLogout}
              disabled={busy}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <LogOut size={16} />
                <span style={{ fontSize: "0.86rem", fontWeight: 500 }}>
                  Sign out
                </span>
              </span>
            </button>

            <button
              type="button"
              className="voice-pack-option"
              style={{
                borderColor: "rgba(239, 68, 68, 0.35)",
                color: "#ef4444"
              }}
              onClick={handleDeleteMyAccount}
              disabled={busy}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Trash2 size={16} />
                <span style={{ fontSize: "0.86rem", fontWeight: 500 }}>
                  Delete account
                </span>
              </span>
            </button>
          </div>
        ) : step === "google" ? (
          /* Google Account Sign-In Step */
          <form
            onSubmit={handleGoogleContinue}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.88rem",
                fontWeight: 600,
                marginBottom: 2
              }}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </div>

            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                padding: "11px 14px",
                fontSize: "0.88rem",
                outline: "none"
              }}
            />

            <input
              type="email"
              required
              autoFocus
              placeholder="Enter your Gmail address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-peacock)",
                borderRadius: 10,
                padding: "11px 14px",
                fontSize: "0.88rem",
                outline: "none"
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 4
              }}
            >
              <button
                type="button"
                className="pill-btn"
                onClick={() => {
                  setStep("choice");
                  setErrorMsg("");
                }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="pill-btn peacock-active"
                style={{ padding: "9px 18px" }}
                disabled={busy || !email.trim()}
              >
                <span>Continue</span>
              </button>
            </div>
          </form>
        ) : step === "otp" ? (
          /* Verify 6-Digit Email Code */
          <form
            onSubmit={handleVerifyEmailOtp}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                textAlign: "center",
                lineHeight: 1.5
              }}
            >
              Enter the 6-digit verification code for <strong>{email}</strong>
              {devOtpHint && (
                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "var(--accent-peacock)",
                    fontWeight: 600
                  }}
                >
                  Verification code: {devOtpHint}
                </span>
              )}
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              placeholder="Enter 6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-peacock)",
                borderRadius: 10,
                padding: "11px 14px",
                fontSize: "1.05rem",
                textAlign: "center",
                letterSpacing: "0.22em",
                outline: "none"
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 4
              }}
            >
              <button
                type="button"
                className="pill-btn"
                onClick={() => {
                  setStep("choice");
                  setErrorMsg("");
                }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="pill-btn peacock-active"
                style={{ padding: "9px 18px" }}
                disabled={busy || otpCode.length < 6}
              >
                <KeyRound size={14} />
                <span>Verify & Log in</span>
              </button>
            </div>
          </form>
        ) : (
          /* Main Login Gate (ChatGPT Style — Login Required Before Chatting) */
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button
              type="button"
              onClick={handleGoogleContinue}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 11,
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontSize: "0.92rem",
                fontWeight: 500
              }}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--text-muted)",
                fontSize: "0.74rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em"
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--border-subtle)"
                }}
              />
              <span>or</span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--border-subtle)"
                }}
              />
            </div>

            <form
              onSubmit={handleRequestEmailOtp}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 11,
                  padding: "12px 14px",
                  fontSize: "0.92rem",
                  outline: "none"
                }}
              />
              <button
                type="submit"
                className="pill-btn peacock-active"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "12px 16px",
                  borderRadius: 11,
                  fontSize: "0.92rem",
                  fontWeight: 600
                }}
                disabled={busy || !email.trim()}
              >
                <Mail size={15} />
                <span>Continue with Email</span>
              </button>
            </form>

            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                textAlign: "center",
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 12
              }}
            >
              By continuing, you agree to our{" "}
              <button
                type="button"
                onClick={onOpenLegalModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-peacock)",
                  textDecoration: "underline",
                  padding: 0,
                  fontSize: "inherit"
                }}
              >
                Terms & Privacy Policy
              </button>
              .
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
