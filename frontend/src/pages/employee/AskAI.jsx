import { useState, useRef, useEffect } from "react";
import { aiChat } from "../../api";
import { Send, AlertTriangle, CheckCircle, AlertCircle, Bot } from "lucide-react";
import toast from "react-hot-toast";

const DISCLAIMER =
  "People Support AI provides guidance only. All decisions are made by your line manager. For sensitive issues, use the Raise a Concern form — it goes directly to the Managing Director.";

function ConfidenceBadge({ level }) {
  if (level === "based_on_policy")
    return <span className="flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle size={12}/>Based on policy</span>;
  if (level === "speak_to_md")
    return <span className="flex items-center gap-1 text-xs text-red-700 font-medium"><AlertTriangle size={12}/>Speak to MD</span>;
  return <span className="flex items-center gap-1 text-xs text-amber-700 font-medium"><AlertCircle size={12}/>Confirm with manager</span>;
}

export default function AskAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await aiChat(userMsg.content, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.message, confidence: res.confidence, escalated: res.escalated, escalation_url: res.escalation_url }]);
    } catch {
      toast.error("Failed to reach People Support AI. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="page-title">Ask People Support AI</h1>
        <p className="text-sm text-brand-muted mt-1">{DISCLAIMER}</p>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-white border border-brand-border rounded-lg p-4 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-brand-muted gap-3">
            <Bot size={40} className="text-brand-green opacity-40" />
            <p className="text-sm">Ask me anything about leave policies, request processes, or HR procedures.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${msg.role === "user" ? "bg-brand-green text-white" : "bg-gray-50 border border-brand-border text-brand-ink"}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.confidence && (
                <div className={`mt-2 pt-2 border-t ${msg.role === "assistant" ? "border-brand-border" : "border-green-600"}`}>
                  <ConfidenceBadge level={msg.confidence} />
                </div>
              )}
              {msg.escalated && msg.escalation_url && (
                <a href={msg.escalation_url} className="mt-2 block text-xs text-red-700 underline font-medium">
                  → Raise a Concern (goes directly to MD)
                </a>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-brand-border rounded-lg px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="input flex-1"
          placeholder="Ask about leave, policies, requests…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary flex items-center gap-2">
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}
