const formatDate = (timestamp) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(timestamp);

export default function Sidebar({
  chats,
  activeChatId,
  isOpen,
  onClose,
  onCreateChat,
  onSelectChat,
  onLogout,
  user,
}) {
  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={`sidebar-backdrop ${isOpen ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div>
            <p className="eyebrow">Signed in</p>
            <h3>{user.name}</h3>
            <p className="muted-text">{user.email}</p>
          </div>
          <button className="ghost-button desktop-hidden" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <button className="primary-button" onClick={onCreateChat} type="button">
          New conversation
        </button>

        <div className="sidebar-list">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`chat-link ${chat.id === activeChatId ? "active" : ""}`}
              onClick={() => onSelectChat(chat.id)}
              type="button"
            >
              <span>{chat.title}</span>
              <small>{formatDate(chat.updatedAt)}</small>
            </button>
          ))}
        </div>

        <button className="ghost-button logout" onClick={onLogout} type="button">
          Log out
        </button>
      </aside>
    </>
  );
}
