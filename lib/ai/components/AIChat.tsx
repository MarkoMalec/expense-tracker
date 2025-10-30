"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useEffect, useState, useRef } from "react";
import { Bot, X, Send, Sparkles, Loader2, Wrench, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const formatToolName = (toolName: string) => {
  return toolName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const CHAT_HISTORY_KEY = "ai-chat-history";
const CHAT_ID = "expense-tracker-chat";

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);

  const { messages, sendMessage, status, addToolResult, setMessages } = useChat({
    id: CHAT_ID, // This enables automatic persistence
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      console.log(toolCall.toolName);
      setCurrentTool(toolCall.toolName);
    },
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        try {
          const parsedMessages = JSON.parse(stored);
          if (parsedMessages.length > 0) {
            setMessages(parsedMessages);
          }
        } catch (e) {
          console.error("Failed to parse chat history:", e);
        }
      }
    }
  }, [setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (status === "ready") {
      setCurrentTool(null);
    }
  }, [status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      localStorage.removeItem(CHAT_HISTORY_KEY);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-20 md:left-6 z-50 flex md:h-[600px] w-full md:max-w-[420px] flex-col md:rounded-2xl border-0 md:border border-border bg-background md:shadow-2xl transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-blue-500/10 to-purple-600/10 px-4 py-3 md:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
                {status !== "ready" && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  {status === "ready" ? "Online" : "Thinking..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="rounded-full p-1 hover:bg-accent transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 mb-3">
                    <Sparkles className="h-6 w-6 text-blue-500" />
                  </div>
                  <p className="text-sm font-medium mb-1">
                    How can I help you?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ask me anything about your expenses
                  </p>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 md:gap-3",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full",
                      message.role === "user"
                        ? "bg-primary"
                        : "bg-gradient-to-br from-blue-500 to-purple-600"
                    )}
                  >
                    {message.role === "user" ? (
                      <span className="text-[10px] md:text-xs font-semibold text-primary-foreground">
                        You
                      </span>
                    ) : (
                      <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex flex-col gap-1 rounded-2xl px-3 md:px-4 py-2 max-w-[80%] md:max-w-[75%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return (
                          <span
                            key={index}
                            className="text-sm whitespace-pre-wrap"
                          >
                            {part.text}
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {status === "submitted" ? (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2">
                      <span
                        className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                    {currentTool && (
                      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                        <Wrench className="h-3 w-3" />
                        <span>Using: {formatToolName(currentTool)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : status === "streaming" && currentTool ? (
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Wrench className="h-3 w-3 animate-pulse" />
                  <span>Using: {formatToolName(currentTool)}</span>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3 md:p-4 safe-area-inset-bottom">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={status !== "ready"}
                placeholder="Type your message..."
                className="flex-1 rounded-full border-2 focus-visible:ring-2 focus-visible:ring-blue-500/50 text-sm md:text-base"
              />
              <Button
                type="submit"
                disabled={status !== "ready" || !input.trim()}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Chat Button - Hidden on mobile when chat is open */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 left-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg transition-all duration-300 hover:scale-110 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50",
          isOpen && "hidden md:flex"
        )}
        aria-label="Toggle AI Chat"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-10 w-10 text-white" />
        )}
      </button>
    </>
  );
}
