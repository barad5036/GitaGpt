export default function MessageBubble({ message, user }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-xl p-4 rounded-xl ${
        isUser ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
      }`}>
        
        <p className="text-sm mb-1 opacity-70">
          {isUser ? user.name : "GitaGPT"}
        </p>

        <p className="whitespace-pre-wrap">{message.content}</p>

        {!isUser && message.sources?.length > 0 && (
          <div className="mt-3 text-xs opacity-70">
            📖 Chapter {message.sources[0].chapter}, Verse {message.sources[0].verse}
          </div>
        )}
      </div>
    </div>
  );
}