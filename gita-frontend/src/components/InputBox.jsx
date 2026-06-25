export default function InputBox({ disabled, input, onChange, onSend }) {
  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend();
  };

  return (
    <div className="flex gap-2 p-4 border-t border-gray-700 bg-gray-900">
      <textarea
        value={input}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // ✅ Enter to send
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Talk to me..."
        rows={1}
        className="flex-1 bg-gray-800 p-3 rounded-lg text-white resize-none outline-none focus:ring-2 focus:ring-green-500"
      />

      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className={`px-4 rounded-lg transition ${
          disabled || !input.trim()
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-500"
        }`}
      >
        Send
      </button>
    </div>
  );
}