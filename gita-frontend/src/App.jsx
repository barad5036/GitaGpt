import { useState, useRef, useEffect, useCallback } from "react";

const SUGGESTIONS = [
  "What does the Gita say about fear?",
  "Explain the concept of Dharma",
  "What is the meaning of 'Nishkama Karma'?",
  "How should I deal with grief according to Krishna?",
  "Translate Bhagavad Gita 2:47 with explanation",
  "What does Krishna say about the mind?",
];

const STORAGE_KEY = "gitagpt:threads:v1";

function loadThreads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveThreads(threads) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {}
}

function newThreadId() {
  return crypto.randomUUID?.() ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(messages) {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  return first.text.length > 48 ? first.text.slice(0, 48) + "…" : first.text;
}

export default function App() {
  const [threads, setThreads] = useState(loadThreads);
  const [activeId, setActiveId] = useState(() => newThreadId());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const activeThread = threads.find((t) => t.id === activeId);
  const messages = activeThread?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeId]);

  const upsertThread = useCallback((id, msgs) => {
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === id);
      const title =
        existing?.title && existing.title !== "New chat"
          ? existing.title
          : deriveTitle(msgs);
      const updated = { id, title, updatedAt: Date.now(), messages: msgs };
      const others = prev.filter((t) => t.id !== id);
      const next = [updated, ...others];
      saveThreads(next);
      return next;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", text };
    const nextMessages = [...messages, userMsg];
    setInput("");
    upsertThread(activeId, nextMessages);
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();
      console.log("API RESPONSE:", data);

      const result = data.results?.[0];
      const botMsg = {
        role: "assistant",
        text: result?.explanation ?? result?.meaning ?? "No response.",
        sources: data.results ?? [],
      };

      const finalMessages = [...nextMessages, botMsg];
      upsertThread(activeId, finalMessages);
    } catch (err) {
      console.error("ERROR:", err);
      upsertThread(activeId, [
        ...nextMessages,
        { role: "assistant", text: "Error connecting to server ❌", sources: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, activeId, upsertThread]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewChat = () => {
    const id = newThreadId();
    setActiveId(id);
    setInput("");
    setSidebarOpen(false);
  };

  const handleDeleteThread = (id) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveThreads(next);
      return next;
    });
    if (activeId === id) handleNewChat();
  };

  const handleSuggestion = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const filteredThreads = searchQuery.trim()
    ? threads.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.messages.some((m) =>
            m.text.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : threads;

  return (
    <div className="app-shell">
      {/* Sidebar backdrop (mobile) */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🕉️</span>
            <h3 style={{ fontSize: "1.1rem" }}>
              Gita<span style={{ color: "var(--accent)" }}>GPT</span>
            </h3>
          </div>
          <button className="ghost-button desktop-hidden" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <button className="primary-button" onClick={handleNewChat} style={{ borderRadius: 16 }}>
          + New chat
        </button>

        <input
          className="composer textarea"
          style={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(255,244,222,0.04)",
            color: "var(--text)",
            padding: "10px 14px",
            outline: "none",
            fontSize: "0.85rem",
          }}
          placeholder="🔍 Search chats…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="sidebar-list" style={{ flex: 1 }}>
          {filteredThreads.length === 0 ? (
            <p className="muted-text" style={{ fontSize: "0.85rem", padding: "8px 4px" }}>
              {searchQuery ? "No chats found" : "No chats yet"}
            </p>
          ) : (
            filteredThreads.map((t) => (
              <div key={t.id} style={{ position: "relative" }}>
                <button
                  className={`chat-link ${t.id === activeId ? "active" : ""}`}
                  style={{ width: "100%", paddingRight: 36 }}
                  onClick={() => { setActiveId(t.id); setSidebarOpen(false); }}
                >
                  <span style={{ fontSize: "0.9rem", fontWeight: 500, truncate: true }}>
                    {t.title}
                  </span>
                  <small>{new Date(t.updatedAt).toLocaleDateString()}</small>
                </button>
                <button
                  onClick={() => handleDeleteThread(t.id)}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "var(--muted)",
                    cursor: "pointer", fontSize: "0.8rem", padding: 4,
                    borderRadius: 6, opacity: 0.6,
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        <div className="logout muted-text" style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>
          Wisdom of the <span style={{ color: "var(--accent)" }}>Bhagavad Gita</span>, in conversation.
        </div>
      </aside>

      {/* Main conversation area */}
      <div className="conversation-shell">
        {/* Topbar */}
        <div className="topbar">
          <button
            className="ghost-button mobile-only"
            onClick={() => setSidebarOpen(true)}
            style={{ borderRadius: 12, padding: "8px 12px" }}
          >
            ☰
          </button>
          <h2 style={{ fontSize: "1rem", fontWeight: 500, color: "var(--muted)" }}>
            {messages.length === 0 ? "New chat" : activeThread?.title ?? "Conversation"}
          </h2>
          <span />
        </div>

        {/* Chat panel */}
        <div className="chat-panel">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div
              style={{
                flex: 1, overflowY: "auto", display: "flex",
                flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "40px 24px", textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36, marginBottom: 20,
                  boxShadow: "0 0 60px -10px rgba(225,164,70,0.6)",
                }}
              >
                🕉️
              </div>
              <h1 style={{ fontSize: "1.7rem", fontWeight: 600, margin: 0 }}>
                What wisdom can I share with you today?
              </h1>
              <p className="muted-text" style={{ marginTop: 10, maxWidth: 420, lineHeight: 1.6 }}>
                Ask anything from the Bhagavad Gita — guidance, philosophy, life lessons, or Sanskrit meaning.
              </p>
              <div
                style={{
                  marginTop: 28,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 10, width: "100%", maxWidth: 640,
                }}
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="ghost-button"
                    style={{
                      textAlign: "left", borderRadius: 14, padding: "12px 16px",
                      fontSize: "0.88rem", lineHeight: 1.4,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div className="message-stack">
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role === "user" ? "user" : ""}`}>
                  <div className={`message-bubble ${msg.role === "user" ? "user" : "assistant"}`}>
                    {msg.role === "assistant" && (
                      <p className="message-label eyebrow">🕉️ GitaGPT</p>
                    )}
                    <p className="message-text">{msg.text}</p>

                    {/* Source cards */}
                    {msg.sources?.length > 0 && (
                      <div className="sources">
                        {msg.sources.map((src, idx) => (
                          <div key={idx} className="source-card">
                            <p className="source-title eyebrow">
                              📖 Ch {src.chapter} · Verse {src.verse}
                            </p>
                            {src.shlok && (
                              <p className="source-copy" style={{ color: "var(--accent-strong)", fontStyle: "italic" }}>
                                {src.shlok}
                              </p>
                            )}
                            <p className="source-copy">{src.meaning}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message-row">
                  <p className="typing-state">✨ GitaGPT is reflecting…</p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Composer */}
          <div className="composer">
            <div className="composer-frame">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message GitaGPT…"
              />
              <button onClick={sendMessage} disabled={!input.trim() || loading}>
                {loading ? "…" : "↑ Send"}
              </button>
            </div>
            <p
              style={{
                textAlign: "center", fontSize: "0.72rem",
                color: "var(--muted)", margin: "6px 0 0",
              }}
            >
              GitaGPT may make mistakes. Always verify important guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
