import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Menu,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Send,
  Mic,
  MicOff,
  Sparkles,
  ChevronDown,
  Square,
  Check,
  Globe,
  Brain,
  Pencil,
  ArrowDown,
  X
} from "lucide-react";
import { LANGUAGES, TRANSLATIONS } from "./data/translations.js";
import { askGitaPuterAI, generateSmartChatTitle } from "./services/puterAi.js";
import {
  loadMemories,
  addMemoryItem,
  updateMemoryItem,
  removeMemoryItem,
  clearAllMemories,
  isMemoryOptedIn,
  setMemoryOptIn,
  deleteAllUserData
} from "./services/memoryService.js";
import {
  speakAnswerFluently,
  stopSpeaking
} from "./services/voiceService.js";
import { LegalAndPrivacyModal } from "./components/common/SafetyAndLegal.jsx";
import {
  OfflineBanner,
  ToastBanner
} from "./components/common/ErrorBoundaryAndFeedback.jsx";
import { SidebarPane } from "./components/sidebar/SidebarPane.jsx";
import { AssistantMessageItem } from "./components/chat/MessageActionsAndItem.jsx";
import { AuthAndProfileModal } from "./components/auth/AuthAndProfileModal.jsx";
import {
  encryptLocalCacheJson,
  decryptLocalCacheJson
} from "./services/webCryptoCache.js";
import { useVoiceInput } from "./hooks/useVoice.js";
import { useAndroidBackButton } from "./hooks/useAndroidBackButton.js";

const STORAGE_KEY = "gitagpt:threads:v2";
const PREFS_KEY = "gitagpt:prefs:v2";

function loadThreads() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("gitagpt:threads:v1");
    if (!raw || raw.startsWith("wc1:")) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveThreads(threads) {
  try {
    encryptLocalCacheJson(threads)
      .then((encryptedPayload) => {
        localStorage.setItem(STORAGE_KEY, encryptedPayload);
      })
      .catch(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
      });
  } catch {
    // ignore storage errors
  }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.theme) parsed.theme = "peacock";
      if (!parsed.language) parsed.language = "hi";
      return parsed;
    }
  } catch {
    // ignore
  }
  return {
    language: "hi",
    theme: "peacock",
    autoRead: true,
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
  return (
    crypto.randomUUID?.() ??
    `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  );
}

function deriveTitle(messages, lang = "hi") {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  return generateSmartChatTitle(first.text, lang);
}

function splitIntoFriendLines(text = "") {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function App() {
  const [threads, setThreads] = useState(loadThreads);
  const [activeId, setActiveId] = useState(() => newThreadId());
  const [prefs, setPrefs] = useState(loadPrefs);

  // Undo Delete & Toast State
  const [toast, setToast] = useState(null);
  const deletedThreadRef = useRef(null);

  // Auth State (Mandatory login before chatting)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("gitagpt:active_user:v1");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Opt-In Memory & Privacy States
  const [memories, setMemories] = useState(loadMemories);
  const [memoryOptIn, setMemoryOptInState] = useState(isMemoryOptedIn);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [newMemoryInput, setNewMemoryInput] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState(null);
  const [editingMemoryText, setEditingMemoryText] = useState("");
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  // Sidebar starts CLOSED on mobile/tablet so it never auto-opens over the screen!
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 900 : true
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Voice & Audio states (Native Android TTS + Browser Neural Speech)
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [speakingLineIdx, setSpeakingLineIdx] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Unified Web + Native Android Voice Input Hook
  const {
    isRecording: isListeningMic,
    startRecording,
    stopRecording,
    cancelRecording
  } = useVoiceInput({
    language: prefs.language || "hi",
    onTranscript: (text) => setInput(text),
    onError: (msg) => setToast({ message: msg, canUndo: false })
  });
  const abortControllerRef = useRef(null);

  // Android Hardware Back Button Handler (Modal -> Drawer -> Confirm Exit)
  useAndroidBackButton({
    hasOpenModal:
      memoryModalOpen || voiceModalOpen || legalModalOpen || authModalOpen,
    closeAllModals: () => {
      setMemoryModalOpen(false);
      setVoiceModalOpen(false);
      setLegalModalOpen(false);
      setAuthModalOpen(false);
    },
    isMobileDrawerOpen:
      typeof window !== "undefined" &&
      window.innerWidth <= 900 &&
      !sidebarCollapsed,
    closeMobileDrawer: () => setSidebarCollapsed(true),
    onToast: (msg) => setToast({ message: msg, canUndo: false })
  });

  const scrollAreaRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const lang = prefs.language || "hi";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.hi;
  const activeThread = threads.find((th) => th.id === activeId);
  const messages = useMemo(
    () => activeThread?.messages ?? [],
    [activeThread]
  );

  const updatePref = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      prefs.theme || "peacock"
    );
  }, [prefs.theme]);

  // Decrypt Web Crypto AES-GCM cached threads on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw.startsWith("wc1:")) {
      decryptLocalCacheJson(raw)
        .then((decrypted) => {
          if (Array.isArray(decrypted)) setThreads(decrypted);
        })
        .catch(() => {});
    }
  }, []);

  // Escape key closes open modals
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setMemoryModalOpen(false);
        setVoiceModalOpen(false);
        setLegalModalOpen(false);
        setAuthModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!showJumpToLatest) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, streamingText, showJumpToLatest]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  }, [input]);

  const handleChatScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 180);
  };

  const scrollToLatest = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowJumpToLatest(false);
  };

  const upsertThread = useCallback(
    (id, msgs) => {
      setThreads((prev) => {
        const existing = prev.find((th) => th.id === id);
        const title =
          existing?.title &&
          existing.title !== "New conversation" &&
          existing.title !== "New chat"
            ? existing.title
            : deriveTitle(msgs, lang);
        const updated = {
          ...existing,
          id,
          title,
          updatedAt: Date.now(),
          messages: msgs
        };
        const others = prev.filter((th) => th.id !== id);
        const next = [updated, ...others];
        saveThreads(next);
        return next;
      });
    },
    [lang]
  );

  const triggerSpeakMessage = useCallback(
    async (msg, idx, overridePrefs = null) => {
      const currentPrefs = overridePrefs || prefs;
      setSpeakingMsgIdx(idx);
      setSpeakingLineIdx(null);
      await speakAnswerFluently({
        text: msg.text,
        lang: currentPrefs.language,
        rate: currentPrefs.speechRate,
        onSentenceChange: (lineIdx) => setSpeakingLineIdx(lineIdx),
        onStatusChange: (status) => {
          setVoiceStatus(status);
          if (status === "idle") {
            setSpeakingMsgIdx(null);
            setSpeakingLineIdx(null);
          }
        }
      });
    },
    [prefs]
  );

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setSpeakingMsgIdx(null);
    setSpeakingLineIdx(null);
    setVoiceStatus("idle");
  }, []);

  const handleStopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setStreamingText("");
  }, []);

  const sendMessage = useCallback(
    async (overrideText, baseHistory = null) => {
      const text = (
        typeof overrideText === "string" ? overrideText : input
      ).trim();
      if (!text || loading) return;

      handleStopSpeaking();
      if (!currentUser) {
        setAuthModalOpen(true);
        return;
      }

      const currentHistory = baseHistory !== null ? baseHistory : messages;
      const userMsg = { role: "user", text, createdAt: Date.now() };
      const nextMessages = [...currentHistory, userMsg];
      setInput("");
      setStreamingText("");
      upsertThread(activeId, nextMessages);
      setLoading(true);

      const ctrl = new AbortController();
      abortControllerRef.current = ctrl;

      try {
        const aiResult = await askGitaPuterAI({
          question: text,
          history: currentHistory,
          language: prefs.language,
          memories,
          userName: currentUser?.name || "",
          signal: ctrl.signal,
          onStreamChunk: (partial) => setStreamingText(partial)
        });

        if (aiResult.updatedMemories) {
          setMemories(aiResult.updatedMemories);
        }

        const botMsg = {
          role: "assistant",
          text: aiResult.text,
          reasoning: aiResult.reasoning,
          emotion: aiResult.emotion,
          memoryAdded: aiResult.memoryAdded,
          isCrisis: aiResult.isCrisis || false,
          helplines: aiResult.helplines || [],
          sources: aiResult.sources ?? [],
          createdAt: Date.now()
        };

        const finalMessages = [...nextMessages, botMsg];
        const botMsgIndex = finalMessages.length - 1;
        setStreamingText("");
        upsertThread(activeId, finalMessages);

        if (prefs.autoRead) {
          triggerSpeakMessage(botMsg, botMsgIndex);
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          if (streamingText.trim()) {
            upsertThread(activeId, [
              ...nextMessages,
              {
                role: "assistant",
                text: streamingText.trim(),
                sources: [],
                createdAt: Date.now()
              }
            ]);
          }
        } else {
          console.error("Error generating response:", err);
        }
      } finally {
        setLoading(false);
        setStreamingText("");
        abortControllerRef.current = null;
      }
    },
    [
      input,
      loading,
      messages,
      activeId,
      prefs,
      memories,
      streamingText,
      currentUser,
      upsertThread,
      handleStopSpeaking,
      triggerSpeakMessage
    ]
  );

  const handleRegenerate = useCallback(
    (assistantIdx) => {
      if (loading) return;
      const sliceBefore = messages.slice(0, assistantIdx);
      const lastUserIdx = sliceBefore.map((m) => m.role).lastIndexOf("user");
      if (lastUserIdx === -1) return;
      const userQuestion = sliceBefore[lastUserIdx].text;
      const historyBeforeUser = sliceBefore.slice(0, lastUserIdx);
      sendMessage(userQuestion, historyBeforeUser);
    },
    [loading, messages, sendMessage]
  );

  const handleFeedbackChange = useCallback(
    (msgIdx, feedbackVal) => {
      const updatedMsgs = messages.map((m, i) =>
        i === msgIdx ? { ...m, feedback: feedbackVal } : m
      );
      upsertThread(activeId, updatedMsgs);
    },
    [messages, activeId, upsertThread]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewChat = () => {
    handleStopSpeaking();
    handleStopGenerating();
    const id = newThreadId();
    setActiveId(id);
    setInput("");
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      setSidebarCollapsed(true);
    }
  };

  const handleDeleteThread = (e, id) => {
    e.stopPropagation();
    const target = threads.find((th) => th.id === id);
    if (target) {
      deletedThreadRef.current = target;
      setToast({
        message:
          lang === "hi"
            ? `"${target.title}" संवाद हटाया गया`
            : `Deleted "${target.title}"`,
        canUndo: true
      });
    }
    setThreads((prev) => {
      const next = prev.filter((th) => th.id !== id);
      saveThreads(next);
      return next;
    });
    if (activeId === id) {
      setActiveId(newThreadId());
    }
  };

  const handleUndoDelete = () => {
    const restored = deletedThreadRef.current;
    if (!restored) return;
    setThreads((prev) => {
      const next = [restored, ...prev];
      saveThreads(next);
      return next;
    });
    setActiveId(restored.id);
    deletedThreadRef.current = null;
    setToast(null);
  };

  const handleTogglePinThread = (id) => {
    setThreads((prev) => {
      const next = prev.map((th) =>
        th.id === id ? { ...th, pinned: !th.pinned } : th
      );
      saveThreads(next);
      return next;
    });
  };

  const handleRenameThread = (id, newTitle) => {
    setThreads((prev) => {
      const next = prev.map((th) =>
        th.id === id ? { ...th, title: newTitle } : th
      );
      saveThreads(next);
      return next;
    });
  };

  const handleToggleMemoryOptIn = (checked) => {
    const val = setMemoryOptIn(checked);
    setMemoryOptInState(val);
  };

  const handleAddCustomMemory = (e) => {
    e.preventDefault();
    if (!newMemoryInput.trim()) return;
    const res = addMemoryItem(newMemoryInput.trim(), "custom", true);
    setMemories(res.memories);
    setNewMemoryInput("");
  };

  const handleSaveEditedMemory = (id) => {
    setMemories(updateMemoryItem(id, editingMemoryText));
    setEditingMemoryId(null);
    setEditingMemoryText("");
  };

  const handleRemoveMemory = (id) => {
    setMemories(removeMemoryItem(id));
  };

  const handleClearMemories = () => {
    setMemories(clearAllMemories());
  };

  const handleDeleteAllMyData = () => {
    handleStopSpeaking();
    handleStopGenerating();
    deleteAllUserData();
    setMemories([]);
    setMemoryOptInState(false);
    setThreads([]);
    setActiveId(newThreadId());
    setMemoryModalOpen(false);
    setToast({ message: t.deleteAllDataConfirm, canUndo: false });
  };

  const toggleMicInput = () => {
    if (isListeningMic) {
      stopRecording();
    } else {
      startRecording();
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
      {/* ChatGPT-Style Collapsible Drawer Sidebar */}
      <SidebarPane
        sidebarCollapsed={sidebarCollapsed}
        onCloseSidebar={() => setSidebarCollapsed(true)}
        onNewChat={handleNewChat}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredThreads={filteredThreads}
        activeId={activeId}
        onSelectThread={(id) => {
          handleStopSpeaking();
          setActiveId(id);
          if (typeof window !== "undefined" && window.innerWidth <= 900) {
            setSidebarCollapsed(true);
          }
        }}
        onDeleteThread={handleDeleteThread}
        onTogglePinThread={handleTogglePinThread}
        onRenameThread={handleRenameThread}
        onAskDailyShloka={(promptText) => sendMessage(promptText)}
        onOpenMemory={() => setMemoryModalOpen(true)}
        onOpenVoiceSettings={() => setVoiceModalOpen(true)}
        onToggleTheme={() =>
          updatePref({
            theme: prefs.theme === "ivory" ? "peacock" : "ivory"
          })
        }
        theme={prefs.theme}
        memoriesCount={memories.length}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        t={t}
        lang={lang}
      />

      {/* Main Workspace */}
      <main className="main-workspace">
        <OfflineBanner lang={lang} />

        {/* ChatGPT App-Style Clean Top Header (Never Overlaps on Mobile) */}
        <header className="workspace-header">
          <div className="header-left">
            <button
              className="icon-btn"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title="Menu"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>

            <div className="header-brand-pill" onClick={handleNewChat}>
              <img
                src="/logo.png"
                alt="GitaGPT"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  objectFit: "cover"
                }}
              />
              <span className="header-title-text">{t.appName}</span>
            </div>
          </div>

          <div className="header-right">
            {/* Compact Language Switcher */}
            <div className="pill-select-wrapper" title="Change Language">
              <Globe
                size={13}
                style={{
                  position: "absolute",
                  left: 9,
                  color: "var(--accent-peacock)",
                  pointerEvents: "none"
                }}
              />
              <select
                className="pill-select"
                aria-label="Select Language"
                style={{ paddingLeft: 26, paddingRight: 22 }}
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
                    style={{ background: "#121a24", color: "#f1f5f9" }}
                  >
                    {l.native}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: "absolute",
                  right: 7,
                  color: "var(--text-muted)",
                  pointerEvents: "none"
                }}
              />
            </div>

            {/* 1-Tap Auto-Voice Toggle */}
            <button
              type="button"
              className={`icon-btn ${prefs.autoRead ? "voice-active-btn" : ""}`}
              onClick={() => {
                const nextAuto = !prefs.autoRead;
                updatePref({ autoRead: nextAuto });
                if (!nextAuto) handleStopSpeaking();
              }}
              title={prefs.autoRead ? t.autoReadOn : t.autoReadOff}
              aria-label="Toggle voice reading"
            >
              {prefs.autoRead ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* 1-Tap New Chat Icon */}
            <button
              type="button"
              className="icon-btn"
              onClick={handleNewChat}
              title={t.newChat}
              aria-label={t.newChat}
            >
              <Plus size={19} />
            </button>
          </div>
        </header>

        {/* Conversation Area */}
        <div
          ref={scrollAreaRef}
          onScroll={handleChatScroll}
          className="chat-scroll-area"
          role="log"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="sacred-emblem" aria-hidden="true">
                <img src="/logo.png" alt="GitaGPT" className="brand-logo-img" />
              </div>
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

                const isSpeakingThis =
                  speakingMsgIdx === idx && voiceStatus !== "idle";

                return (
                  <AssistantMessageItem
                    key={idx}
                    msg={msg}
                    idx={idx}
                    lang={lang}
                    t={t}
                    isSpeakingThis={isSpeakingThis}
                    speakingLineIdx={speakingLineIdx}
                    voiceStatus={voiceStatus}
                    voiceDownloadPct={null}
                    onSpeakOrStop={() => {
                      if (isSpeakingThis) {
                        handleStopSpeaking();
                      } else {
                        triggerSpeakMessage(msg, idx);
                      }
                    }}
                    onRegenerate={handleRegenerate}
                    onFeedbackChange={handleFeedbackChange}
                  />
                );
              })}

              {/* Streaming Partial Response + Stop Generating Button */}
              {loading && (
                <div className="msg-turn-assistant">
                  <div className="assistant-avatar" aria-hidden="true">
                    <img
                      src="/logo.png"
                      alt="GitaGPT"
                      className="brand-logo-img"
                    />
                  </div>
                  <div className="assistant-body">
                    <div className="assistant-meta-row">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--accent-peacock)",
                          fontSize: "0.85rem"
                        }}
                      >
                        <Sparkles size={15} />
                        <span>{t.thinking}</span>
                      </div>
                      <button
                        type="button"
                        className="speak-action-btn speaking"
                        onClick={handleStopGenerating}
                      >
                        <Square size={11} />
                        <span>{t.stopGenerating}</span>
                      </button>
                    </div>

                    {streamingText && (
                      <div className="chatgpt-assistant-prose">
                        {splitIntoFriendLines(streamingText).map(
                          (line, sIdx) => (
                            <p key={sIdx} className="chatgpt-paragraph">
                              {line}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {showJumpToLatest && messages.length > 0 && (
            <button
              type="button"
              className="jump-latest-btn"
              onClick={scrollToLatest}
            >
              <ArrowDown size={14} />
              <span>{t.jumpToLatest}</span>
            </button>
          )}
        </div>

        {/* Bottom ChatGPT-Style Composer */}
        <div className="composer-dock">
          <div className="composer-box">
            <textarea
              ref={textareaRef}
              rows={1}
              className="composer-textarea"
              aria-label={t.inputPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.inputPlaceholder}
            />

            {isListeningMic && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "rgba(239, 68, 68, 0.14)",
                  color: "#f87171",
                  fontSize: "0.75rem"
                }}
              >
                <div className="voice-wave">
                  <span />
                  <span />
                  <span />
                </div>
                <button
                  type="button"
                  onClick={cancelRecording}
                  aria-label="Cancel voice recording"
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    padding: 0,
                    display: "inline-flex"
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <button
              type="button"
              className="composer-icon-btn"
              onClick={toggleMicInput}
              aria-label="Voice input microphone"
              style={{
                color: isListeningMic ? "#ef4444" : "var(--text-secondary)",
                background: isListeningMic
                  ? "rgba(239,68,68,0.12)"
                  : "transparent"
              }}
              title="Voice input"
            >
              {isListeningMic ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              className="send-btn"
              aria-label="Send message"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send message"
            >
              <Send size={15} />
            </button>
          </div>
          <div className="composer-footer-row">
            <p className="composer-disclaimer">{t.disclaimer}</p>
            <button
              type="button"
              onClick={() => setLegalModalOpen(true)}
              className="composer-legal-link"
            >
              {t.privacyTermsBtn}
            </button>
          </div>
        </div>
      </main>

      {/* Toast Notification with Undo Delete */}
      <ToastBanner
        toast={toast}
        onUndo={handleUndoDelete}
        onDismiss={() => setToast(null)}
      />

      {/* Opt-In Friend Memory & Privacy Controls Modal */}
      {memoryModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t.memoryModalTitle}
          onClick={() => setMemoryModalOpen(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
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
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <Brain size={18} style={{ color: "var(--accent-peacock)" }} />
                {t.memoryModalTitle}
              </h3>
              <button
                className="icon-btn"
                aria-label="Close modal"
                onClick={() => setMemoryModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p
              style={{
                margin: "0 0 12px",
                fontSize: "0.83rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5
              }}
            >
              {t.memoryModalDesc}
            </p>

            {/* Opt-In Consent Toggle */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 14px",
                borderRadius: 12,
                background: "var(--peacock-soft)",
                border: "1px solid var(--border-peacock)",
                marginBottom: 14,
                cursor: "pointer"
              }}
            >
              <span style={{ fontSize: "0.84rem", fontWeight: 500 }}>
                {t.memoryOptInLabel}
              </span>
              <input
                type="checkbox"
                checked={memoryOptIn}
                onChange={(e) => handleToggleMemoryOptIn(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: "var(--accent-peacock)"
                }}
              />
            </label>

            <form
              onSubmit={handleAddCustomMemory}
              style={{ display: "flex", gap: 8, marginBottom: 14 }}
            >
              <input
                type="text"
                value={newMemoryInput}
                onChange={(e) => setNewMemoryInput(e.target.value)}
                placeholder={t.memoryInputPlaceholder}
                style={{
                  flex: 1,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: "0.84rem",
                  outline: "none"
                }}
              />
              <button type="submit" className="pill-btn peacock-active">
                <Plus size={14} />
                <span>{t.memoryAddBtn}</span>
              </button>
            </form>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 220,
                overflowY: "auto",
                marginBottom: 16
              }}
            >
              {memories.length === 0 ? (
                <p
                  style={{
                    fontSize: "0.84rem",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    padding: "16px 8px",
                    margin: 0
                  }}
                >
                  {t.memoryEmpty}
                </p>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="voice-pack-option"
                    style={{ cursor: "default" }}
                  >
                    {editingMemoryId === mem.id ? (
                      <div style={{ display: "flex", gap: 6, flex: 1 }}>
                        <input
                          type="text"
                          value={editingMemoryText}
                          onChange={(e) => setEditingMemoryText(e.target.value)}
                          style={{
                            flex: 1,
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border-peacock)",
                            borderRadius: 8,
                            padding: "5px 9px",
                            fontSize: "0.84rem"
                          }}
                        />
                        <button
                          type="button"
                          className="pill-btn peacock-active"
                          onClick={() => handleSaveEditedMemory(mem.id)}
                        >
                          <Check size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: "0.85rem", flex: 1 }}>
                          💛 {mem.text}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Edit memory"
                            onClick={() => {
                              setEditingMemoryId(mem.id);
                              setEditingMemoryText(mem.text);
                            }}
                            style={{ width: 28, height: 28 }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Delete memory"
                            onClick={() => handleRemoveMemory(mem.id)}
                            style={{ width: 28, height: 28 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 12,
                gap: 8,
                flexWrap: "wrap"
              }}
            >
              {memories.length > 0 ? (
                <button
                  type="button"
                  className="pill-btn"
                  onClick={handleClearMemories}
                >
                  <Trash2 size={13} />
                  <span>{t.memoryClearAll}</span>
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                className="pill-btn"
                style={{
                  borderColor: "rgba(239, 68, 68, 0.45)",
                  color: "#f87171"
                }}
                onClick={handleDeleteAllMyData}
              >
                <Trash2 size={13} />
                <span>{t.deleteAllDataBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Terms Modal */}
      <LegalAndPrivacyModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
      />

      {/* Sign In & Account Modal (Mandatory Gate when not logged in) */}
      <AuthAndProfileModal
        isOpen={authModalOpen || !currentUser}
        isMandatoryGate={!currentUser}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(u) => setCurrentUser(u)}
        threads={threads}
        memories={memories}
        onOpenLegalModal={() => {
          setLegalModalOpen(true);
        }}
        onWipeLocalData={handleDeleteAllMyData}
        onToast={(msg) => setToast({ message: msg, canUndo: false })}
      />

      {/* Clean Voice & Audio Settings Modal (Zero Local WASM Bloat) */}
      {voiceModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Voice Settings"
          onClick={() => setVoiceModalOpen(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <Volume2 size={18} style={{ color: "var(--accent-peacock)" }} />
                <span>Voice & Audio Settings</span>
              </h3>
              <button
                className="icon-btn"
                aria-label="Close modal"
                onClick={() => setVoiceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--peacock-soft)",
                border: "1px solid var(--border-peacock)",
                marginBottom: 16,
                cursor: "pointer"
              }}
            >
              <span style={{ fontSize: "0.86rem", fontWeight: 500 }}>
                {t.autoReadToggleLabel}
              </span>
              <input
                type="checkbox"
                checked={prefs.autoRead}
                onChange={(e) => updatePref({ autoRead: e.target.checked })}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: "var(--accent-peacock)"
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18
              }}
            >
              <span
                style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
              >
                {t.speechSpeedLabel}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {[0.9, 1.0, 1.1, 1.2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    className={`pill-btn ${
                      prefs.speechRate === spd ? "peacock-active" : ""
                    }`}
                    onClick={() => updatePref({ speechRate: spd })}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                type="button"
                className="pill-btn peacock-active"
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
