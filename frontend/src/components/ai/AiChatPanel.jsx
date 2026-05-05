// ─────────────────────────────────────────────
//  components/ai/AiChatPanel.jsx
//  Floating glassmorphism AI chat panel
//  Streams responses from Python ai_service
// ─────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { useAiStream } from "../../hooks/useAiStream";
import useUIStore from "../../store/uiStore";
import useCityStore from "../../store/cityStore";

const SUGGESTED = [
  "Why is Building A using so much energy?",
  "Which building has the highest temperature?",
  "Summarise current campus status",
  "Are there any anomalies right now?",
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 10,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "rgba(0,229,160,0.15)",
            border: "1px solid rgba(0,229,160,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            flexShrink: 0,
            marginRight: 8,
            marginTop: 2,
          }}
        >
          ✦
        </div>
      )}
      <div
        style={{
          maxWidth: "82%",
          padding: "8px 12px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          background: isUser
            ? "rgba(0,229,255,0.12)"
            : "rgba(10,25,41,0.8)",
          border: isUser
            ? "1px solid rgba(0,229,255,0.2)"
            : "1px solid rgba(255,255,255,0.06)",
          fontSize: 12,
          color: isUser ? "#b8eeff" : "#c8dff0",
          fontFamily: isUser ? "monospace" : "'Inter', sans-serif",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.text}
        {msg.streaming && (
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 12,
              background: "#00e5a0",
              marginLeft: 3,
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function AiChatPanel() {
  const isOpen = useUIStore((s) => s.isAiPanelOpen);
  const closeAiPanel = useUIStore((s) => s.closeAiPanel);
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const sensorData = useCityStore((s) => s.sensorData);
  const buildings = useCityStore((s) => s.buildings);

  const { messages, isStreaming, error, sendMessage, stopStream, clearMessages } =
    useAiStream();

  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  function buildContext() {
    // Pass current sensor readings as context to the AI
    return {
      selectedEntityId: selectedId,
      sensorData,
      buildings: buildings.map((b) => ({
        entityId: b.entityId,
        name: b.name,
        maxCapacity: b.maxCapacity,
        sensors: b.sensors,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  function handleSend() {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim(), buildContext());
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 340,
        height: 520,
        background: "rgba(4,12,22,0.92)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(0,229,160,0.2)",
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
        boxShadow: "0 0 40px rgba(0,229,160,0.08), 0 20px 60px rgba(0,0,0,0.5)",
        overflow: "hidden",
        animation: "slideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid rgba(0,229,160,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(0,229,160,0.12)",
              border: "1px solid rgba(0,229,160,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
            }}
          >
            ✦
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#00e5a0",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
              }}
            >
              CITY AI ASSISTANT
            </div>
            <div style={{ fontSize: 9, color: "#2a6a4a", fontFamily: "monospace" }}>
              {isStreaming ? "THINKING..." : "READY"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={clearMessages}
            title="Clear chat"
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              color: "#4a7a9b",
              fontSize: 10,
              padding: "3px 7px",
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            CLR
          </button>
          <button
            onClick={closeAiPanel}
            style={{
              background: "none",
              border: "none",
              color: "#4a7a9b",
              fontSize: 16,
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 2px",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 12px 4px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                color: "#2a4a6a",
                fontFamily: "monospace",
                textAlign: "center",
                marginBottom: 16,
                marginTop: 8,
              }}
            >
              Ask anything about your campus
            </div>
            {/* Suggested prompts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SUGGESTED.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                  style={{
                    background: "rgba(0,229,160,0.04)",
                    border: "1px solid rgba(0,229,160,0.12)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    color: "#7abfa0",
                    fontSize: 11,
                    fontFamily: "monospace",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    lineHeight: 1.4,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(0,229,160,0.09)";
                    e.currentTarget.style.borderColor = "rgba(0,229,160,0.25)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(0,229,160,0.04)";
                    e.currentTarget.style.borderColor = "rgba(0,229,160,0.12)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <Message key={msg.id ?? msg.ts} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          style={{
            margin: "0 12px",
            padding: "6px 10px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 6,
            fontSize: 10,
            color: "#fca5a5",
            fontFamily: "monospace",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* ── Input bar ── */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid rgba(0,229,160,0.1)",
          display: "flex",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the campus..."
          rows={1}
          style={{
            flex: 1,
            background: "rgba(0,229,160,0.04)",
            border: "1px solid rgba(0,229,160,0.15)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "#c8dff0",
            fontSize: 12,
            fontFamily: "monospace",
            resize: "none",
            outline: "none",
            lineHeight: 1.4,
            maxHeight: 80,
            overflowY: "auto",
          }}
        />
        <button
          onClick={isStreaming ? stopStream : handleSend}
          disabled={!isStreaming && !input.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: isStreaming
              ? "rgba(239,68,68,0.15)"
              : input.trim()
              ? "rgba(0,229,160,0.15)"
              : "rgba(0,229,160,0.05)",
            border: isStreaming
              ? "1px solid rgba(239,68,68,0.3)"
              : "1px solid rgba(0,229,160,0.2)",
            color: isStreaming ? "#ef4444" : "#00e5a0",
            fontSize: 14,
            cursor: isStreaming || input.trim() ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
            alignSelf: "flex-end",
          }}
        >
          {isStreaming ? "■" : "▶"}
        </button>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}