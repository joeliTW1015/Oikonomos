import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { sendChatMessage, executeAction } from "../api/client.js";
import PendingActionsPanel from "./PendingActionsPanel.jsx";

export default function ChatPage({ selectedDate, onRefresh }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  const [editedParams, setEditedParams] = useState({});
  const [confirming, setConfirming] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingActions]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setPendingActions([]);
    setEditedParams({});

    try {
      const data = await sendChatMessage(nextMessages, selectedDate);

      if (data.actions && data.actions.length > 0) {
        setPendingActions(data.actions);
        const params = {};
        for (const action of data.actions) {
          params[action.id] = { ...action.params };
        }
        setEditedParams(params);
      }

      if (data.reply) {
        setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      }
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

  function handleEditParam(actionId, key, value) {
    setEditedParams((prev) => ({
      ...prev,
      [actionId]: { ...prev[actionId], [key]: value },
    }));
  }

  function handleRemoveAction(actionId) {
    setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
  }

  async function handleConfirm() {
    setConfirming(true);
    const count = pendingActions.length;
    try {
      for (const action of pendingActions) {
        await executeAction({ ...action, params: editedParams[action.id] || action.params });
      }
      onRefresh?.();
      setPendingActions([]);
      setEditedParams({});
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Done! Added ${count} item${count !== 1 ? "s" : ""}.` },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error saving: ${err.message}` },
      ]);
    } finally {
      setConfirming(false);
    }
  }

  function handleDismiss() {
    setPendingActions([]);
    setEditedParams({});
  }

  return (
    <div className="chat-page">
      <div className="chat-page__messages">
        {messages.length === 0 && pendingActions.length === 0 && (
          <p className="chat-page__empty">
            Ask me anything about your tasks, goals, or schedule.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat__bubble chat__bubble--${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {pendingActions.length > 0 && (
          <PendingActionsPanel
            actions={pendingActions}
            editedParams={editedParams}
            onEditParam={handleEditParam}
            onRemove={handleRemoveAction}
            onConfirm={handleConfirm}
            onDismiss={handleDismiss}
            confirming={confirming}
            selectedDate={selectedDate}
          />
        )}
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
