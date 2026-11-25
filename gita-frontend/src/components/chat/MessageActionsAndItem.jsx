import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Volume2,
  Square,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { CrisisHelplineCard } from "../common/SafetyAndLegal.jsx";

function splitIntoParagraphs(text = "") {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function MarkdownProse({ text = "", isStreaming = false }) {
  return (
    <div className="chatgpt-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  );
}

export function AssistantMessageItem({
  msg,
  idx,
  lang,
  t,
  isSpeakingThis,
  speakingLineIdx,
  onSpeakOrStop,
  onRegenerate,
  onFeedbackChange
}) {
  const [openShlokaMap, setOpenShlokaMap] = useState({});
  const [copied, setCopied] = useState(false);

  const paragraphs = splitIntoParagraphs(msg.text);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="msg-turn-assistant">
      <div className="assistant-avatar" aria-hidden="true">
        <img src="/logo.png" alt="GitaGPT" className="brand-logo-img" />
      </div>

      <div className="assistant-body">
        {/* Clean ChatGPT-Style Flowing Markdown Prose */}
        {isSpeakingThis && speakingLineIdx != null ? (
          <div className="chatgpt-assistant-prose">
            {paragraphs.map((para, pIdx) => {
              const isCurrentlySpoken = speakingLineIdx === pIdx;
              return (
                <div
                  key={pIdx}
                  className={`chatgpt-paragraph ${
                    isCurrentlySpoken ? "speaking-highlight" : ""
                  }`}
                >
                  <MarkdownProse text={para} />
                </div>
              );
            })}
          </div>
        ) : (
          <MarkdownProse text={msg.text || ""} />
        )}

        {/* P0 Safety Layer: Immediate Indian Helpline Card on Crisis Messages */}
        {msg.isCrisis && msg.helplines?.length > 0 && (
          <CrisisHelplineCard helplines={msg.helplines} lang={lang} />
        )}

        {/* Compact Collapsible Gita Verse Reference Pill */}
        {msg.sources?.length > 0 &&
          msg.sources.map((src, sIdx) => {
            if (!src) return null;
            const isShlokaOpen = openShlokaMap[sIdx] ?? false;
            return (
              <div key={sIdx} className="shloka-card">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap"
                  }}
                >
                  <button
                    type="button"
                    className="shloka-header"
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                    onClick={() =>
                      setOpenShlokaMap((prev) => ({
                        ...prev,
                        [sIdx]: !prev[sIdx]
                      }))
                    }
                  >
                    <BookOpen size={13} />
                    <span>
                      {t.shlokaHeading} · BG {src.chapter}.{src.verse}
                    </span>
                    {isShlokaOpen ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </button>

                  {src.sourceUrl && isShlokaOpen && (
                    <a
                      href={src.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.68rem",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--peacock-soft)",
                        border: "1px solid var(--border-peacock)",
                        color: "var(--accent-peacock)",
                        textDecoration: "none",
                        fontWeight: 600
                      }}
                    >
                      <span>BG {src.chapter}.{src.verse}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {isShlokaOpen && (
                  <>
                    {src.shlok && (
                      <div className="shloka-sanskrit">{src.shlok}</div>
                    )}
                    {src.meaning && (
                      <p className="shloka-meaning">{src.meaning}</p>
                    )}
                  </>
                )}
              </div>
            );
          })}

        {/* ChatGPT-Style Minimal Icon Action Row */}
        <div className="chatgpt-action-row">
          <button
            type="button"
            className={`msg-action-chip ${isSpeakingThis ? "active-feedback" : ""}`}
            onClick={onSpeakOrStop}
            title={isSpeakingThis ? t.stopBtn : t.listenBtn}
            aria-label={isSpeakingThis ? t.stopBtn : t.listenBtn}
          >
            {isSpeakingThis ? <Square size={13} /> : <Volume2 size={14} />}
          </button>

          <button
            type="button"
            className="msg-action-chip"
            onClick={handleCopy}
            title={t.copyBtn}
            aria-label={t.copyBtn}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>

          <button
            type="button"
            className="msg-action-chip"
            onClick={() => onRegenerate(idx)}
            title={t.regenerateBtn}
            aria-label={t.regenerateBtn}
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            className={`msg-action-chip ${
              msg.feedback === "up" ? "active-feedback" : ""
            }`}
            onClick={() =>
              onFeedbackChange(idx, msg.feedback === "up" ? null : "up")
            }
            title="Helpful"
            aria-label="Mark response helpful"
          >
            <ThumbsUp size={13} />
          </button>

          <button
            type="button"
            className={`msg-action-chip ${
              msg.feedback === "down" ? "active-feedback" : ""
            }`}
            onClick={() =>
              onFeedbackChange(idx, msg.feedback === "down" ? null : "down")
            }
            title="Not helpful"
            aria-label="Mark response not helpful"
          >
            <ThumbsDown size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
