import { Phone, ShieldAlert, X, ShieldCheck } from "lucide-react";

export function CrisisHelplineCard({ helplines = [], lang = "hi" }) {
  const isHindi = ["hi", "sa", "mr", "gu"].includes(lang);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.45)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 4
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#f87171",
          fontWeight: 600,
          fontSize: "0.86rem"
        }}
      >
        <ShieldAlert size={17} />
        <span>
          {isHindi
            ? "२४×७ निःशुल्क भारतीय मानसिक स्वास्थ्य हेल्पलाइन (आप अकेले नहीं हैं)"
            : "24×7 Free Indian Mental Health Helplines (You Are Not Alone)"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 8
        }}
      >
        {helplines.map((h, idx) => (
          <div
            key={idx}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}
          >
            <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              {h.name}
            </div>
            <div style={{ fontSize: "0.73rem", color: "var(--text-secondary)" }}>
              {h.hours}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <a
                href={`tel:${h.number.replace(/\s+/g, "")}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(34, 197, 94, 0.16)",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  color: "#4ade80",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                <Phone size={12} />
                <span>{h.number}</span>
              </a>
              {h.altNumber && (
                <a
                  href={`tel:${h.altNumber.replace(/\s+/g, "")}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.75rem",
                    textDecoration: "none"
                  }}
                >
                  <Phone size={11} />
                  <span>{h.altNumber}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LegalAndPrivacyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Privacy Policy and Terms of Use"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1.08rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <ShieldCheck size={18} style={{ color: "var(--accent-peacock)" }} />
            <span>Privacy Policy, Safety & Terms of Use</span>
          </h3>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontSize: "0.84rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6
          }}
        >
          <div>
            <strong style={{ color: "var(--text-primary)" }}>
              1. Spiritual & Philosophical Companion Disclaimer
            </strong>
            <p style={{ margin: "4px 0 0" }}>
              GitaGPT is an AI philosophical companion rooted in the teachings of the
              Shrimad Bhagavad Gita. It does not provide medical, psychiatric,
              psychological, or legal advice. If you are experiencing a mental
              health crisis or thoughts of self-harm, please call India’s 24×7
              national helpline <strong>Tele-MANAS at 14416</strong> or{" "}
              <strong>1800-891-4416</strong> immediately.
            </p>
          </div>

          <div>
            <strong style={{ color: "var(--text-primary)" }}>
              2. Opt-In Friend Memory, Envelope Encryption & Honest Threat Model
            </strong>
            <p style={{ margin: "4px 0 0" }}>
              Friend Memory is strictly opt-in. On our self-hosted backend, your
              messages, memories, and conversation titles are encrypted at rest
              using <strong>AES-256-GCM Envelope Encryption</strong> with a
              per-user Data Encryption Key (DEK) and HKDF-SHA256 subkeys. Note
              that GitaGPT is <strong>not end-to-end encrypted (E2EE)</strong>{" "}
              because the backend must read the plaintext in memory to send your
              prompt to the AI model. You can export your data (JSON) or
              permanently erase your account and keys at any time.
            </p>
          </div>

          <div>
            <strong style={{ color: "var(--text-primary)" }}>
              3. Canonical Scripture Integrity
            </strong>
            <p style={{ margin: "4px 0 0" }}>
              All Bhagavad Gita verse cards (Adhyay/Shlok, Devanagari Sanskrit,
              and IAST transliteration) are retrieved from verified canonical
              scripture records and linked to their source reference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
