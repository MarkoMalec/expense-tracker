"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Loader2,
  Wrench,
  Trash2,
  Copy,
  Check,
  Download,
  Ellipsis,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ---------- Utils ----------
const formatToolName = (toolName: string) =>
  toolName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

const CHAT_HISTORY_KEY = "ai-chat-history";
const CHAT_TOOLS_KEY = "ai-chat-tools";
const CHAT_TIMESTAMPS_KEY = "ai-chat-timestamps";
const CHAT_ID = "expense-tracker-chat";

// Basic pretty timestamp
const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ---------- Components ----------
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:.2s]" />
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      className="rounded-full p-1.5 hover:bg-accent text-muted-foreground"
      title="Copy"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative my-4 text-center">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <span className="relative bg-background px-3 text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// Mini status timeline shown at bottom while the agent works
function AgentActivityBar({
  phase,
  toolName,
}: {
  phase: "idle" | "planning" | "tool" | "drafting" | "finalizing";
  toolName?: string | null;
}) {
  const steps = [
    { key: "planning", label: "Planning" },
    { key: "tool", label: toolName ? `Calling ${formatToolName(toolName)}` : "Tools" },
    { key: "drafting", label: "Composing" },
    { key: "finalizing", label: "Finalizing" },
  ] as const;

  const activeIndex =
    phase === "idle" ? -1 : steps.findIndex((s) => s.key === phase);

  return (
    <div className="sticky bottom-0 w-full rounded-xl border border-border bg-muted/60 p-2 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="font-medium">Agent</span>
        <span className="mx-1">·</span>
        {phase === "idle" ? (
          <span>Ready</span>
        ) : (
          <span className="flex items-center gap-1">
            {phase === "tool" ? <Wrench className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
            {steps[Math.max(0, activeIndex)].label}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "h-1.5 w-20 rounded-full bg-muted-foreground/20",
                i <= activeIndex && "bg-primary/70",
              )}
            />
            {i < steps.length - 1 && (
              <Ellipsis className={cn("h-3 w-3 text-muted-foreground", i < activeIndex && "text-primary/70")} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-300">
      <Wrench className="h-3 w-3" /> {formatToolName(name)}
    </span>
  );
}

// ---------- Main Chat ----------
export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [messageTools, setMessageTools] = useState<Record<string, string>>({});
  const [messageTimestamps, setMessageTimestamps] = useState<Record<string, number>>({});
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: CHAT_ID,
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      setCurrentTool(toolCall.toolName);
    },
  });

  // ---------- Persistence ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as UIMessage[];
      if (parsed?.length) setMessages(parsed);
    } catch {}
  }, [setMessages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTools = localStorage.getItem(CHAT_TOOLS_KEY);
    const storedTimestamps = localStorage.getItem(CHAT_TIMESTAMPS_KEY);
    try {
      if (storedTools) {
        const parsedTools = JSON.parse(storedTools) as Record<string, string>;
        setMessageTools(parsedTools);
      }
      if (storedTimestamps) {
        const parsedTimestamps = JSON.parse(storedTimestamps) as Record<string, number>;
        setMessageTimestamps(parsedTimestamps);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (Object.keys(messageTools).length) {
      localStorage.setItem(CHAT_TOOLS_KEY, JSON.stringify(messageTools));
    }
  }, [messageTools]);

  useEffect(() => {
    if (Object.keys(messageTimestamps).length) {
      localStorage.setItem(CHAT_TIMESTAMPS_KEY, JSON.stringify(messageTimestamps));
    }
  }, [messageTimestamps]);

  // ---------- Scroll mgmt ----------
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, isOpen]);

  useEffect(() => {
    const el = scrollParentRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      setAtBottom(nearBottom);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ---------- Map tool to last assistant message when complete ----------
  useEffect(() => {
    if (status === "ready" && currentTool && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        setMessageTools((prev) => ({ ...prev, [last.id]: currentTool }));
      }
      setCurrentTool(null);
    }
  }, [status, currentTool, messages]);

  // ---------- Track message timestamps ----------
  useEffect(() => {
    messages.forEach((message) => {
      if (!messageTimestamps[message.id]) {
        setMessageTimestamps((prev) => ({ ...prev, [message.id]: Date.now() }));
      }
    });
  }, [messages, messageTimestamps]);

  // ---------- Derived UI state ----------
  const phase: "idle" | "planning" | "tool" | "drafting" | "finalizing" =
    status === "ready"
      ? "idle"
      : currentTool
      ? "tool"
      : status === "submitted"
      ? "planning"
      : status === "streaming"
      ? "drafting"
      : "finalizing";

  const dayLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const m of messages) {
      const d = new Date(messageTimestamps[m.id] ?? Date.now());
      const key = d.toDateString();
      labels[key] = d.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return labels;
  }, [messages, messageTimestamps]);

  // ---------- Handlers ----------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleClearHistory = () => {
    if (!confirm("Clear the chat history?")) return;
    setMessages([]);
    setMessageTools({});
    setMessageTimestamps({});
    localStorage.removeItem(CHAT_HISTORY_KEY);
    localStorage.removeItem(CHAT_TOOLS_KEY);
    localStorage.removeItem(CHAT_TIMESTAMPS_KEY);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Render ----------
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex w-full flex-col border-0 bg-background transition-all duration-300 md:inset-auto md:bottom-20 md:left-6 md:h-[900px] md:max-w-[720px] md:rounded-2xl md:border md:shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-blue-500/10 to-purple-600/10 px-4 py-3 md:rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-4.5 w-4.5 text-white" />
                {status !== "ready" && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-blue-500"></span>
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">AI Assistant</h3>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
                      status === "ready"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", status === "ready" ? "bg-emerald-500" : "bg-amber-500")} />
                    {status === "ready" ? "Online" : "Working"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {status === "ready" ? "Ask me anything about your expenses" : "Analyzing request"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={exportJSON} className="rounded-full p-1 hover:bg-accent" title="Export JSON">
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {messages.length > 0 && (
                <button onClick={handleClearHistory} className="rounded-full p-1 hover:bg-accent" title="Clear chat">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-accent" title="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollParentRef} className="relative flex-1 overflow-y-auto p-4">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20">
                  <Sparkles className="h-7 w-7 text-blue-500" />
                </div>
                <p className="text-sm font-medium">How can I help you today?</p>
                <p className="text-xs text-muted-foreground">Classic AI chat vibes. Try: "What did I spend on groceries last month?"</p>
              </div>
            )}

            {/* Day dividers + messages */}
            <div className="space-y-4">
              {messages.map((message, idx) => {
                const created = new Date(messageTimestamps[message.id] ?? Date.now());
                const prev = messages[idx - 1];
                const showDivider = (() => {
                  const prevDate = prev ? new Date(messageTimestamps[prev.id] ?? Date.now()) : null;
                  return !prevDate || prevDate.toDateString() !== created.toDateString();
                })();

                return (
                  <div key={message.id}>
                    {showDivider && <DayDivider label={dayLabels[created.toDateString()] ?? ""} />}

                    <div className={cn("flex gap-2 md:gap-3", message.role === "user" ? "flex-row-reverse" : "flex-row")}> 
                      {/* Avatar */}
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-gradient-to-br from-blue-500 to-purple-600 text-white",
                        )}
                        title={message.role === "user" ? "You" : "Assistant"}
                      >
                        {message.role === "user" ? (
                          <span className="text-[10px] font-semibold">You</span>
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={cn(
                          "group relative max-w-[78%] rounded-2xl px-4 py-3",
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {/* Content */}
                        <div className="assistant-msg prose prose-sm dark:prose-invert prose-pre:overflow-x-auto prose-pre:bg-background/70">
                          {message.parts.map((part, i) => (
                            <div key={i}>
                              {part.type === "text" && (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Meta */}
                        <div className={cn("mt-2 flex items-center gap-2 text-[10px]", message.role === "user" ? "text-primary-foreground/80" : "text-muted-foreground")}> 
                          <span>{formatTime(created)}</span>
                          {message.role === "assistant" && (
                            <>
                              {messageTools[message.id] && <ToolChip name={messageTools[message.id]} />}
                              {/* Copy */}
                              <CopyButton
                                text={message.parts
                                  .map((p) => (p.type === "text" ? p.text : ""))
                                  .join("\n")}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Live thinking / tool indicator block */}
              {(status === "submitted" || status === "streaming" || currentTool) && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="max-w-[78%] rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    {currentTool ? (
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 animate-pulse" />
                        <span>Using {formatToolName(currentTool)}…</span>
                      </div>
                    ) : status === "submitted" ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Planning <TypingDots /></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Composing <TypingDots /></span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Activity bar */}
          <div className="border-t border-border p-2">
            <AgentActivityBar phase={phase} toolName={currentTool} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 md:p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={status !== "ready"}
                placeholder="Type your message…"
                className="flex-1 rounded-full border-2 text-sm md:text-base focus-visible:ring-2 focus-visible:ring-blue-500/50"
              />
              <Button
                type="submit"
                disabled={status !== "ready" || !input.trim()}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 transition-all hover:scale-105 hover:from-blue-600 hover:to-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {!atBottom && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-24 right-4 inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs shadow-md hover:bg-accent"
              >
                <ChevronDown className="h-3.5 w-3.5" /> New messages
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 left-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg transition-all duration-300 hover:scale-110 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50",
          isOpen && "hidden md:flex",
        )}
        aria-label="Toggle AI Chat"
      >
        {isOpen ? <X className="h-5 w-5 text-white" /> : <Bot className="h-10 w-10 text-white" />}
      </button>
    </>
  );
}
