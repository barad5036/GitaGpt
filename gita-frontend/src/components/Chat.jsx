import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function Chat({ messages, loading, user }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <section className="chat-panel">
      <div className="chat-intro">
        <p className="eyebrow">Inner clarity</p>
        <h1>A spiritual assistant that remembers the thread of your story.</h1>
        <p>
          Ask about stress, relationships, purpose, discipline, or confusion. The
          response blends conversation memory with relevant Bhagavad Gita passages.
        </p>
      </div>

      <div className="message-stack">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} user={user} />
        ))}
        {loading ? <p className="typing-state">Gathering context and composing a reply...</p> : null}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
