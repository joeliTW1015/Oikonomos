import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { sendChatMessage } from "../api/client.js";

export default function ChatPage({ selectedDate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await sendChatMessage(nextMessages, selectedDate);
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([...nextMessages, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-page__messages">
        {messages.length === 0 && (
          <p className="chat-page__empty">
            Ask me anything about your tasks, goals, or schedule.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat__bubble chat__bubble--${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="chat__bubble chat__bubble--assistant chat__thinking">
            <span className="chat__dot" />
            <span className="chat__dot" />
            <span className="chat__dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-page__input-row">
        <textarea
          className="chat-page__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something…"
          rows={1}
          disabled={loading}
        />
        <button
          className="chat__send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
