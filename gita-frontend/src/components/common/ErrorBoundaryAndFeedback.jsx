import { Component, useState, useEffect } from "react";
import { WifiOff, RotateCcw, X } from "lucide-react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("GitaGPT ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            height: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
            background: "var(--bg-main)",
            color: "var(--text-primary)"
          }}
        >
          <div className="sacred-emblem" aria-hidden="true">
            <img src="/logo.png" alt="GitaGPT" className="brand-logo-img" />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.35rem" }}>
            एक छोटा सा विराम आया है · A brief pause occurred
          </h2>
          <p
            style={{
              maxWidth: 420,
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              marginBottom: 20
            }}
          >
            Don’t worry, my friend—your conversations are safe in local storage.
            Click below to refresh the screen.
          </p>
          <button
            type="button"
            className="pill-btn peacock-active"
            style={{ padding: "9px 18px", fontSize: "0.88rem" }}
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={15} />
            <span>Refresh GitaGPT</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function OfflineBanner({ lang = "hi" }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (isOnline) return null;

  const isHindi = ["hi", "sa", "mr", "gu"].includes(lang);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "rgba(245, 158, 11, 0.14)",
        borderBottom: "1px solid var(--border-strong)",
        padding: "6px 16px",
        fontSize: "0.78rem",
        color: "var(--accent-bright)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }}
    >
      <WifiOff size={14} />
      <span>
        {isHindi
          ? "आप अभी ऑफलाइन हैं — स्थानीय गीता सखा मार्गदर्शन और डाउनलोड किए गए वॉइस पैक ऑफलाइन भी काम करेंगे।"
          : "You are currently offline — built-in Gita Sakha guidance and downloaded voice packs continue to work."}
      </span>
    </div>
  );
}

export function ToastBanner({ toast, onUndo, onDismiss }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 22,
        right: 22,
        zIndex: 60,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-peacock)",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 14px 36px rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: "0.84rem",
        color: "var(--text-primary)"
      }}
    >
      <span>{toast.message}</span>
      {toast.canUndo && onUndo && (
        <button
          type="button"
          className="pill-btn peacock-active"
          style={{ padding: "3px 10px", fontSize: "0.76rem" }}
          onClick={onUndo}
        >
          <RotateCcw size={12} />
          <span>Undo</span>
        </button>
      )}
      <button
        type="button"
        className="icon-btn"
        style={{ width: 24, height: 24 }}
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
}
