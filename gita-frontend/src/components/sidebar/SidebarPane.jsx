import { useState } from "react";
import {
  X,
  Plus,
  Search,
  Trash2,
  Pin,
  Pencil,
  Check,
  BookOpen,
  Brain,
  SlidersHorizontal,
  Sun,
  Moon,
  User
} from "lucide-react";
import { getDailyShloka } from "../../data/gitaVerses.js";

function groupThreadsByDate(threads = [], t) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7DaysAgo = startOfToday - 7 * 86400000;

  const pinned = [];
  const today = [];
  const yesterday = [];
  const prev7Days = [];
  const older = [];

  for (const th of threads) {
    if (th.pinned) {
      pinned.push(th);
      continue;
    }
    const ts = th.updatedAt || 0;
    if (ts >= startOfToday) {
      today.push(th);
    } else if (ts >= startOfYesterday) {
      yesterday.push(th);
    } else if (ts >= startOf7DaysAgo) {
      prev7Days.push(th);
    } else {
      older.push(th);
    }
  }

  return [
    { key: "pinned", label: `📌 ${t.pinnedChats || "Pinned"}`, items: pinned },
    { key: "today", label: t.today || "Today", items: today },
    { key: "yesterday", label: t.yesterday || "Yesterday", items: yesterday },
    {
      key: "prev7",
      label: t.previous7Days || "Previous 7 Days",
      items: prev7Days
    },
    { key: "older", label: t.olderChats || "Earlier", items: older }
  ].filter((g) => g.items.length > 0);
}

export function SidebarPane({
  sidebarCollapsed,
  onCloseSidebar,
  onNewChat,
  searchQuery,
  onSearchChange,
  filteredThreads,
  activeId,
  onSelectThread,
  onDeleteThread,
  onTogglePinThread,
  onRenameThread,
  onAskDailyShloka,
  onOpenMemory,
  onOpenVoiceSettings,
  onToggleTheme,
  theme,
  memoriesCount,
  currentUser,
  onOpenAuth,
  t,
  lang
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");

  const groups = groupThreadsByDate(filteredThreads, t);
  const dailyShloka = getDailyShloka();
  const isHindi = ["hi", "sa", "mr", "gu"].includes(lang);

  const startRename = (e, th) => {
    e.stopPropagation();
    setRenamingId(th.id);
    setRenameText(th.title);
  };

  const commitRename = (e, id) => {
    e.stopPropagation();
    if (renameText.trim()) {
      onRenameThread(id, renameText.trim());
    }
    setRenamingId(null);
    setRenameText("");
  };

  return (
    <>
      {/* Mobile Tap-to-Close Backdrop */}
      <div
        className={`mobile-sidebar-backdrop ${
          !sidebarCollapsed ? "visible" : ""
        }`}
        onClick={onCloseSidebar}
        aria-hidden="true"
      />

      <aside
        className={`gita-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        aria-label="Conversation history"
      >
        <div className="sidebar-header">
          <div className="brand-mark">
            <div className="brand-icon" aria-hidden="true">
              <img src="/logo.png" alt="GitaGPT" className="brand-logo-img" />
            </div>
            <div className="brand-title">
              Gita<span>GPT</span>
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={onCloseSidebar}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={onNewChat}>
          <Plus size={16} style={{ color: "var(--accent-peacock)" }} />
          <span>{t.newChat}</span>
        </button>

        <div className="sidebar-search">
          <Search size={14} className="sidebar-search-icon" />
          <input
            type="search"
            aria-label={t.searchPlaceholder}
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="sidebar-threads">
          {groups.length === 0 ? (
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
            groups.map((group) => (
              <div key={group.key} style={{ marginBottom: 8 }}>
                <div className="sidebar-section-label">{group.label}</div>
                {group.items.map((th) => (
                  <div
                    key={th.id}
                    className={`thread-item ${
                      th.id === activeId ? "active" : ""
                    }`}
                  >
                    {renamingId === th.id ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 6px",
                          width: "100%"
                        }}
                      >
                        <input
                          type="text"
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(e, th.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            background: "var(--bg-main)",
                            border: "1px solid var(--border-peacock)",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: "0.8rem",
                            outline: "none"
                          }}
                        />
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 28, height: 28 }}
                          aria-label="Save title"
                          onClick={(e) => commitRename(e, th.id)}
                        >
                          <Check size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="thread-btn"
                          style={{ paddingRight: 68 }}
                          onClick={() => onSelectThread(th.id)}
                        >
                          {th.title}
                        </button>
                        <div className="thread-actions-group">
                          <button
                            type="button"
                            className="thread-action-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePinThread(th.id);
                            }}
                            title={th.pinned ? "Unpin" : "Pin"}
                            aria-label={th.pinned ? "Unpin chat" : "Pin chat"}
                            style={{
                              color: th.pinned
                                ? "var(--accent-peacock)"
                                : undefined
                            }}
                          >
                            <Pin size={12} />
                          </button>
                          <button
                            type="button"
                            className="thread-action-icon"
                            onClick={(e) => startRename(e, th)}
                            title="Rename"
                            aria-label="Rename chat"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="thread-action-icon delete"
                            onClick={(e) => onDeleteThread(e, th.id)}
                            title="Delete conversation"
                            aria-label={`Delete conversation ${th.title}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Daily Shloka of the Day Card */}
        {dailyShloka && (
          <div
            style={{
              margin: "4px 12px 8px",
              padding: "9px 11px",
              borderRadius: 11,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <BookOpen size={11} />
                {t.dailyShlokaTitle || "Shloka of the Day"}
              </span>
              <span>
                BG {dailyShloka.chapter}.{dailyShloka.verse}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-devanagari)",
                fontSize: "0.76rem",
                color: "var(--text-primary)",
                lineHeight: 1.45
              }}
            >
              {dailyShloka.shlok.split("\n")[0]}
            </div>
            <button
              type="button"
              onClick={() => {
                onCloseSidebar();
                onAskDailyShloka(
                  isHindi
                    ? `मेरे दोस्त, आज के श्लोक (गीता ${dailyShloka.chapter}.${dailyShloka.verse}) का मेरे दैनिक जीवन में क्या अर्थ है?`
                    : `Hey friend, explain today's shloka (Bhagavad Gita ${dailyShloka.chapter}.${dailyShloka.verse}) for my daily life.`
                );
              }}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                textAlign: "left",
                fontSize: "0.72rem",
                color: "var(--accent-peacock)",
                fontWeight: 500
              }}
            >
              {isHindi ? "सखा से इसका अर्थ जानें →" : "Reflect on this verse →"}
            </button>
          </div>
        )}

        {/* ChatGPT App-Style Bottom Settings & Profile Dock */}
        <div
          style={{
            padding: "10px 12px 12px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="pill-btn"
              style={{ flex: 1, justifyContent: "center", padding: "7px 8px" }}
              onClick={() => {
                if (window.innerWidth <= 900) onCloseSidebar();
                onOpenMemory();
              }}
            >
              <Brain size={14} style={{ color: "var(--accent-peacock)" }} />
              <span>Memory{memoriesCount > 0 ? ` (${memoriesCount})` : ""}</span>
            </button>

            <button
              type="button"
              className="pill-btn"
              style={{ flex: 1, justifyContent: "center", padding: "7px 8px" }}
              onClick={() => {
                if (window.innerWidth <= 900) onCloseSidebar();
                onOpenVoiceSettings();
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Voice</span>
            </button>

            <button
              type="button"
              className="icon-btn"
              style={{
                width: 34,
                height: 34,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)"
              }}
              onClick={onToggleTheme}
              title="Switch Theme"
              aria-label="Switch Theme"
            >
              {theme === "ivory" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.innerWidth <= 900) onCloseSidebar();
              onOpenAuth();
            }}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.84rem",
              fontWeight: 500
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <User size={15} style={{ color: "var(--accent-peacock)" }} />
              <span>
                {currentUser ? currentUser.name : "Sign in / Account"}
              </span>
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)"
              }}
            >
              {currentUser ? "Active" : "Guest"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
