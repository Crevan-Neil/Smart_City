// ─────────────────────────────────────────────
//  hooks/useAiStream.js
//  Streams AI responses via Server-Sent Events
//  from the Python ai_service /chat endpoint
// ─────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";
import useAuthStore from "../store/authStore";

const AI_URL = import.meta.env.VITE_AI_URL || "http://localhost:8001";

export function useAiStream() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const token = useAuthStore((s) => s.token);

  const sendMessage = useCallback(async (userText, context = {}) => {
    if (!userText.trim() || isStreaming) return;

    // Add user message immediately
    const userMsg = { role: "user", text: userText, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setError(null);

    // Placeholder for the streaming AI response
    const aiMsgId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: aiMsgId, role: "assistant", text: "", ts: aiMsgId, streaming: true },
    ]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${AI_URL}/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: userText, context }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`AI service error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE lines: "data: <token>\n\n"
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const token = line.slice(6);
            if (token === "[DONE]") break;
            accumulated += token;

            // Update the streaming message in place
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, text: accumulated } : m
              )
            );
          }
        }
      }

      // Mark streaming complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, streaming: false } : m
        )
      );
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, text: "Sorry, I couldn't reach the AI service.", streaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, stopStream, clearMessages };
}