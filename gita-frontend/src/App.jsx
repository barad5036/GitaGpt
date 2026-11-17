import { useState, useRef, useEffect, useCallback } from "react";
import {
  PanelLeft,
  Plus,
  Search,
  Trash2,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Send,
  Mic,
  MicOff,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Square,
  Download,
  Check,
  Globe,
  X
} from "lucide-react";
import { LANGUAGES, TRANSLATIONS } from "./data/translations.js";
import { askGitaPuterAI } from "./services/puterAi.js";
import {
  OPEN_SOURCE_VOICE_PACKS,
  speakAnswerFluently,
  stopSpeaking,
  getStoredPiperVoices,
  downloadPiperVoicePack
} from "./services/voiceService.js";

const STORAGE_KEY = "gitagpt:threads:v2";
const PREFS_KEY = "gitagpt:prefs:v2";

function loadThreads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("gitagpt:threads:v1");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveThreads(threads) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {
    // ignore storage errors
  }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.voiceEngine === "puter") parsed.voiceEngine = "piper";
      return parsed;
    }
  } catch {
    // ignore
  }
  return {
    language: "en",
    autoRead: true,
    voiceEngine: "piper",
    piperVoiceId: "en_US-hfc_male-medium",
    speechRate: 1.0
  };
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function newThreadId() {
  return crypto.randomUUID?.() ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(messages) {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  return first.text.length > 42 ? first.text.slice(0, 42) + "…" : first.text;
}

export default function App() {
  const [threads, setThreads] = useState(loadThreads);
  const [activeId, setActiveId] = useState(() => newThreadId());
  const [prefs, setPrefs] = useState(loadPrefs);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Voice & Audio states
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState("idle"); // "idle" | "loading" | "speaking"
  const [voiceDownloadPct, setVoiceDownloadPct] = useState(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [storedVoices, setStoredVoices] = useState([]);
  const [downloadingPackId, setDownloadingPackId] = useState(null);
  const [downloadingPackPct, setDownloadingPackPct] = useState(0);

  // Speech-to-Text microphone state
  const [isListeningMic, setIsListeningMic] = useState(false);
  const recognitionRef = useRef(null);

  // Reasoning expand/collapse state per message index
  const [openReasoning, setOpenReasoning] = useState({});

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const lang = prefs.language || "en";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const activeThread = threads.find((th) => th.id === activeId);
  const messages = activeThread?.messages ?? [];

  const updatePref = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    getStoredPiperVoices().then(setStoredVoices);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeId, lang]);

  // Auto-resize textarea height like ChatGPT
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const upsertThread = useCallback((id, msgs) => {
    setThreads((prev) => {
      const existing = prev.find((th) => th.id === id);
      const title =
        existing?.title && existing.title !== "New conversation" && existing.title !== "New chat"
          ? existing.title
          : deriveTitle(msgs);
      const updated = { id, title, updatedAt: Date.now(), messages: msgs };
      const others = prev.filter((th) => th.id !== id);
      const next = [updated, ...others];
      saveThreads(next);
      return next;
    });
  }, []);

  const triggerSpeakMessage = useCallback(
    async (msg, idx, overridePrefs = null) => {
      const currentPrefs = overridePrefs || prefs;
      setSpeakingMsgIdx(idx);
      setVoiceDownloadPct(null);
      await speakAnswerFluently({
        text: msg.text,
        sources: msg.sources,
        lang: currentPrefs.language,
        engine: currentPrefs.voiceEngine,
        piperVoiceId: currentPrefs.piperVoiceId,
        rate: currentPrefs.speechRate,
        onStatusChange: (status) => {
          setVoiceStatus(status);
          if (status === "idle") {
            setSpeakingMsgIdx(null);
            setVoiceDownloadPct(null);
          }
        },
        onDownloadProgress: (pct) => {
          setVoiceDownloadPct(pct);
          if (pct >= 100) {
            getStoredPiperVoices().then(setStoredVoices);
          }
        }
      });
    },
    [prefs]
  );

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setSpeakingMsgIdx(null);
    setVoiceStatus("idle");
    setVoiceDownloadPct(null);
  }, []);

  const sendMessage = useCallback(
    async (overrideText) => {
      const text = (typeof overrideText === "string" ? overrideText : input).trim();
      if (!text || loading) return;

      handleStopSpeaking();
      const userMsg = { role: "user", text };
      const nextMessages = [...messages, userMsg];
      setInput("");
      upsertThread(activeId, nextMessages);
      setLoading(true);

      try {
        const aiResult = await askGitaPuterAI({
          question: text,
          history: messages,
          language: prefs.language
        });

        const botMsg = {
          role: "assistant",
          text: aiResult.text,
          reasoning: aiResult.reasoning,
          sources: aiResult.sources ?? []
        };

        const finalMessages = [...nextMessages, botMsg];
        const botMsgIndex = finalMessages.length - 1;
        upsertThread(activeId, finalMessages);

        // If Auto-Voice is activated, read the entire answer fluently!
        if (prefs.autoRead) {
          triggerSpeakMessage(botMsg, botMsgIndex);
        }
      } catch (err) {
        console.error("Error generating response:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      input,
      loading,
      messages,
      activeId,
      prefs,
      upsertThread,
      handleStopSpeaking,
      triggerSpeakMessage
    ]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewChat = () => {
    handleStopSpeaking();
    const id = newThreadId();
    setActiveId(id);
    setInput("");
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  };

  const handleDeleteThread = (e, id) => {
    e.stopPropagation();
    setThreads((prev) => {
      const next = prev.filter((th) => th.id !== id);
      saveThreads(next);
      return next;
    });
    if (activeId === id) {
      setActiveId(newThreadId());
    }
  };

  const toggleMicInput = () => {
    if (isListeningMic) {
      recognitionRef.current?.stop();
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is supported in Chrome and Edge browsers.");
      return;
    }

    const recognition = new SpeechRecognition();
    const langObj = LANGUAGES.find((l) => l.code === prefs.language) || LANGUAGES[0];
    recognition.lang = langObj.speechLang || "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListeningMic(true);
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => setIsListeningMic(false);
    recognition.onend = () => setIsListeningMic(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleDownloadPack = async (packId, e) => {
    e.stopPropagation();
    if (downloadingPackId) return;
    setDownloadingPackId(packId);
    setDownloadingPackPct(1);
    try {
      await downloadPiperVoicePack(packId, (pct) => setDownloadingPackPct(pct));
      const updated = await getStoredPiperVoices();
      setStoredVoices(updated);
      updatePref({ voiceEngine: "piper", piperVoiceId: packId });
    } catch (err) {
      console.error("Failed to download voice pack:", err);
    } finally {
      setDownloadingPackId(null);
      setDownloadingPackPct(0);
    }
  };

  const handleTestVoice = () => {
    triggerSpeakMessage(
      {
        text: t.testSampleText,
        sources: []
      },
      -1
    );
  };

  const filteredThreads = searchQuery.trim()
    ? threads.filter(
        (th) =>
          th.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          th.messages.some((m) =>
            m.text.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : threads;

  return (
    <div className="chatgpt-layout">
      {/* Sidebar */}
      <aside className={`gita-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="brand-mark">
            <div className="brand-icon">🕉️</div>
            <div className="brand-title">
              Gita<span>GPT</span>
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={() => setSidebarCollapsed(true)}
            title="Close sidebar"
          >
            <PanelLeft size={18} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={16} style={{ color: "var(--accent)" }} />
          <span>{t.newChat}</span>
        </button>

        <div className="sidebar-search">
          <Search size={14} className="sidebar-search-icon" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sidebar-section-label">{t.today}</div>

        <div className="sidebar-threads">
          {filteredThreads.length === 0 ? (
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                padding: "10px 12px",
                margin: 0
              }}
            >
              {searchQuery ? t.noSearchMatch : t.noChats}
            </p>
          ) : (
            filteredThreads.map((th) => (
              <div
                key={th.id}
                className={`thread-item ${th.id === activeId ? "active" : ""}`}
              >
                <button
                  className="thread-btn"
                  onClick={() => {
                    handleStopSpeaking();
                    setActiveId(th.id);
                    if (window.innerWidth <= 768) setSidebarCollapsed(true);
                  }}
                >
                  {th.title}
                </button>
                <button
                  className="thread-delete-btn"
                  onClick={(e) => handleDeleteThread(e, th.id)}
                  title="Delete conversation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">{t.footerQuote}</div>
      </aside>

      {/* Main ChatGPT-like Workspace */}
      <main className="main-workspace">
        {/* Topbar */}
        <header className="workspace-header">
          <div className="header-left">
            {sidebarCollapsed && (
              <button
                className="icon-btn"
                onClick={() => setSidebarCollapsed(false)}
                title="Open sidebar"
              >
                <PanelLeft size={18} />
              </button>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.92rem",
                fontWeight: 600,
                color: "var(--text-primary)"
              }}
            >
              <span>{t.appName}</span>
              <span
                className="header-hide-mobile"
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 400,
                  color: "var(--text-secondary)"
                }}
              >
                · {t.subtitle}
              </span>
            </div>
          </div>

          <div className="header-right">
            {/* Language Switcher */}
            <div className="pill-select-wrapper" title="Change Language">
              <Globe
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  color: "var(--accent)",
                  pointerEvents: "none"
                }}
              />
              <select
                className="pill-select"
                style={{ paddingLeft: 30 }}
                value={prefs.language}
                onChange={(e) => {
                  handleStopSpeaking();
                  updatePref({ language: e.target.value });
                }}
              >
                {LANGUAGES.map((l) => (
                  <option
                    key={l.code}
                    value={l.code}
                    style={{ background: "#1e1a16", color: "#f4efe6" }}
                  >
                    {l.flag} {l.native} ({l.label})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute",
                  right: 9,
                  color: "var(--text-muted)",
                  pointerEvents: "none"
                }}
              />
            </div>

            {/* Auto-Read Voice Toggle */}
            <button
              type="button"
              className={`pill-btn ${prefs.autoRead ? "active" : ""}`}
              onClick={() => {
                const nextAuto = !prefs.autoRead;
                updatePref({ autoRead: nextAuto });
                if (!nextAuto) handleStopSpeaking();
              }}
              title="Automatically read every answer aloud"
            >
              {prefs.autoRead ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="header-hide-mobile">
                {prefs.autoRead ? t.autoReadOn : t.autoReadOff}
              </span>
            </button>

            {/* Open-Source Voice Pack Settings Button */}
            <button
              type="button"
              className="pill-btn"
              onClick={() => setVoiceModalOpen(true)}
              title="Open-Source Voice Pack & Audio Settings"
            >
              <SlidersHorizontal size={14} />
              <span className="header-hide-mobile">{t.voicePackBtn}</span>
            </button>
          </div>
        </header>

        {/* Conversation Area */}
        <div className="chat-scroll-area">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="sacred-emblem">🕉️</div>
              <div className="welcome-badge">
                <Sparkles size={12} />
                <span>{t.welcomeBadge}</span>
              </div>
              <h1 className="welcome-heading">{t.welcomeTitle}</h1>
              <p className="welcome-sub">{t.welcomeSubtitle}</p>

              <div className="suggestion-grid">
                {t.suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-card"
                    onClick={() => sendMessage(item.prompt)}
                  >
                    <span className="suggestion-category">{item.category}</span>
                    <span className="suggestion-title">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-container">
              {messages.map((msg, idx) => {
                if (msg.role === "user") {
                  return (
                    <div key={idx} className="msg-turn-user">
                      <div className="msg-user-bubble">{msg.text}</div>
                    </div>
                  );
                }

                const isSpeakingThis = speakingMsgIdx === idx && voiceStatus !== "idle";
                const isReasoningExpanded = openReasoning[idx] ?? false;

                return (
                  <div key={idx} className="msg-turn-assistant">
                    <div className="assistant-avatar">🕉️</div>
                    <div className="assistant-body">
                      <div className="assistant-meta-row">
                        <div className="assistant-name">
                          <span>{t.appName}</span>
                        </div>

                        {/* Fluent Voice Read / Stop Control for each answer */}
                        <button
                          type="button"
                          className={`speak-action-btn ${
                            isSpeakingThis ? "speaking" : ""
                          }`}
                          onClick={() => {
                            if (isSpeakingThis) {
                              handleStopSpeaking();
                            } else {
                              triggerSpeakMessage(msg, idx);
                            }
                          }}
                        >
                          {isSpeakingThis ? (
                            <>
                              <div className="voice-wave">
                                <span />
                                <span />
                                <span />
                              </div>
                              <span>
                                {voiceStatus === "loading" && voiceDownloadPct !== null
                                  ? `${t.loadingVoice} (${voiceDownloadPct}%)`
                                  : t.stopBtn}
                              </span>
                              <Square size={11} />
                            </>
                          ) : (
                            <>
                              <Volume2 size={13} />
                              <span>{t.listenBtn}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Collapsible Dharmic Reasoning Block */}
                      {msg.reasoning && (
                        <div className="reasoning-box">
                          <button
                            type="button"
                            className="reasoning-toggle"
                            onClick={() =>
                              setOpenReasoning((prev) => ({
                                ...prev,
                                [idx]: !prev[idx]
                              }))
                            }
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Sparkles size={13} style={{ color: "var(--accent)" }} />
                              {t.reasoningTitle}
                            </span>
                            {isReasoningExpanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                          {isReasoningExpanded && (
                            <div className="reasoning-content">{msg.reasoning}</div>
                          )}
                        </div>
                      )}

                      {/* Main Answer Text */}
                      <div className="assistant-text">{msg.text}</div>

                      {/* Sacred Bhagavad Gita Shloka Reference Card */}
                      {msg.sources?.length > 0 &&
                        msg.sources.map((src, sIdx) => (
                          <div key={sIdx} className="shloka-card">
                            <div className="shloka-header">
                              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <BookOpen size={14} />
                                {t.shlokaHeading} · BG {src.chapter}.{src.verse}
                              </span>
                              <span>
                                Chapter {src.chapter}, Verse {src.verse}
                              </span>
                            </div>

                            {src.shlok && (
                              <div className="shloka-sanskrit">{src.shlok}</div>
                            )}

                            {src.meaning && (
                              <div>
                                <div className="shloka-section-label">
                                  {t.meaningHeading}
                                </div>
                                <p className="shloka-meaning">{src.meaning}</p>
                              </div>
                            )}

                            {src.dailyLife && (
                              <div>
                                <div className="shloka-section-label">
                                  {t.dailyLifeHeading}
                                </div>
                                <p className="shloka-daily-life">
                                  💡 {src.dailyLife}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="msg-turn-assistant">
                  <div className="assistant-avatar">🕉️</div>
                  <div className="assistant-body">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "var(--accent-bright)",
                        fontSize: "0.88rem",
                        paddingTop: 4
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{t.thinking}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Bottom ChatGPT-style Composer */}
        <div className="composer-dock">
          <div className="composer-box">
            <textarea
              ref={textareaRef}
              rows={1}
              className="composer-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.inputPlaceholder}
            />

            <button
              type="button"
              className="icon-btn"
              onClick={toggleMicInput}
              style={{
                color: isListeningMic ? "#ef4444" : "var(--text-secondary)",
                background: isListeningMic ? "rgba(239,68,68,0.12)" : "transparent"
              }}
              title="Voice input"
            >
              {isListeningMic ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="composer-disclaimer">{t.disclaimer}</p>
        </div>
      </main>

      {/* Open-Source Voice Pack & Audio Settings Modal */}
      {voiceModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setVoiceModalOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <Volume2 size={18} style={{ color: "var(--accent)" }} />
                {t.voiceModalTitle}
              </h3>
              <button
                className="icon-btn"
                onClick={() => setVoiceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p
              style={{
                margin: "0 0 16px",
                fontSize: "0.84rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5
              }}
            >
              {t.voiceModalDesc}
            </p>

            {/* Auto-read toggle row */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(217, 155, 67, 0.08)",
                border: "1px solid var(--border-strong)",
                marginBottom: 16,
                cursor: "pointer"
              }}
            >
              <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>
                {t.autoReadToggleLabel}
              </span>
              <input
                type="checkbox"
                checked={prefs.autoRead}
                onChange={(e) => updatePref({ autoRead: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
              />
            </label>

            {/* Voice Engine Selector */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                  marginBottom: 8
                }}
              >
                {t.voiceEngineLabel}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { id: "piper", label: t.piperVoiceLabel },
                  { id: "browser", label: t.browserVoiceLabel }
                ].map((eng) => (
                  <div
                    key={eng.id}
                    className={`voice-pack-option ${
                      prefs.voiceEngine === eng.id ? "selected" : ""
                    }`}
                    onClick={() => updatePref({ voiceEngine: eng.id })}
                  >
                    <span style={{ fontSize: "0.86rem", fontWeight: 500 }}>
                      {eng.label}
                    </span>
                    {prefs.voiceEngine === eng.id && (
                      <Check size={16} style={{ color: "var(--accent-bright)" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Open-Source Piper Neural Voice Pack Models */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                  marginBottom: 8
                }}
              >
                Open-Source Voice Packs (Piper Neural VITS)
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {OPEN_SOURCE_VOICE_PACKS.map((pack) => {
                  const isDownloaded = storedVoices.includes(pack.id);
                  const isSelected =
                    prefs.voiceEngine === "piper" && prefs.piperVoiceId === pack.id;
                  const isDownloading = downloadingPackId === pack.id;

                  return (
                    <div
                      key={pack.id}
                      className={`voice-pack-option ${isSelected ? "selected" : ""}`}
                      onClick={() =>
                        updatePref({
                          voiceEngine: "piper",
                          piperVoiceId: pack.id
                        })
                      }
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.86rem",
                            fontWeight: 600,
                            color: "var(--text-primary)"
                          }}
                        >
                          {pack.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            marginTop: 2
                          }}
                        >
                          {pack.description} · {pack.size}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {isDownloaded ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.74rem",
                              padding: "4px 9px",
                              borderRadius: 999,
                              background: "rgba(34,197,94,0.15)",
                              color: "#4ade80"
                            }}
                          >
                            <Check size={12} /> {t.downloadedBadge}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="pill-btn"
                            onClick={(e) => handleDownloadPack(pack.id, e)}
                            disabled={isDownloading}
                          >
                            <Download size={13} />
                            <span>
                              {isDownloading
                                ? `${downloadingPackPct}%`
                                : t.downloadVoiceBtn}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reading Speed */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {t.speechSpeedLabel}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {[0.9, 1.0, 1.1, 1.2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    className={`pill-btn ${
                      prefs.speechRate === spd ? "active" : ""
                    }`}
                    onClick={() => updatePref({ speechRate: spd })}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Test Fluent Voice Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="pill-btn active"
                style={{ padding: "8px 16px" }}
                onClick={handleTestVoice}
              >
                <Volume2 size={15} />
                <span>{t.testVoiceBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
