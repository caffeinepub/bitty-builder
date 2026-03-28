import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ChatMessage } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onClose: () => void;
}

export default function ChatPopup({ onClose }: Props) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const principal = identity?.getPrincipal();
  const { actor } = useActor();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adminPasswordTarget, setAdminPasswordTarget] = useState<bigint | null>(
    null,
  );
  const [adminPassword, setAdminPassword] = useState("");
  const [submittingAdmin, setSubmittingAdmin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!actor) return;
    try {
      const msgs = await actor.getChatMessages();
      setMessages(msgs);
    } catch (_e) {
      // silent
    }
  }, [actor]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scrollRef is stable
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !actor) return;
    setSending(true);
    try {
      await actor.sendChatMessage(newMessage.trim());
      setNewMessage("");
      await fetchMessages();
    } catch (_e) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteOwn = async (id: bigint) => {
    if (!actor) return;
    try {
      await actor.deleteOwnChatMessage(id);
      await fetchMessages();
    } catch (_e) {
      toast.error("Could not delete message");
    }
  };

  const handleAdminDelete = async () => {
    if (adminPasswordTarget === null || !actor) return;
    setSubmittingAdmin(true);
    try {
      await actor.adminDeleteChatMessage(adminPasswordTarget, adminPassword);
      setAdminPasswordTarget(null);
      setAdminPassword("");
      await fetchMessages();
      toast.success("Message deleted");
    } catch (_e) {
      toast.error("Wrong password");
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const formatTime = (ts: bigint) => {
    const ms = Number(ts) / 1_000_000;
    return new Date(ms).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/70"
        onClick={onClose}
      />

      {/* Chat popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="fixed inset-x-4 bottom-4 top-16 z-50 flex flex-col rounded-sm max-w-md mx-auto"
        style={{
          background: "#06060f",
          border: "2px solid rgba(0,221,255,0.5)",
          boxShadow:
            "0 0 40px rgba(0,221,255,0.2), 0 0 80px rgba(170,0,255,0.1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "rgba(0,221,255,0.3)" }}
        >
          <span
            className="font-display font-black text-lg tracking-wide"
            style={{
              background: "linear-gradient(135deg, #00DDFF, #AA00FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 8px rgba(0,221,255,0.5))",
            }}
          >
            💬 PLAYER CHAT
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-sm text-muted-foreground hover:text-white transition-colors px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
        >
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-mono text-xs text-muted-foreground text-center">
                No messages yet. Be the first to say something!
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isOwn =
              principal && msg.author.toText() === principal.toText();
            return (
              <motion.div
                key={String(msg.id)}
                initial={{ opacity: 0, x: isOwn ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex flex-col gap-0.5 ${
                  isOwn ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: isOwn ? "#AAFF00" : "#00DDFF" }}
                  >
                    {msg.nickname}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  {!isOwn && (
                    <button
                      type="button"
                      onClick={() => setAdminPasswordTarget(msg.id)}
                      className="text-[9px] font-mono opacity-30 hover:opacity-70 transition-opacity mt-1"
                      style={{ color: "#FF00AA" }}
                      title="Admin delete"
                    >
                      ×
                    </button>
                  )}
                  <div
                    className="px-3 py-1.5 rounded-sm max-w-[80%]"
                    style={{
                      background: isOwn
                        ? "rgba(170,255,0,0.12)"
                        : "rgba(0,221,255,0.08)",
                      border: isOwn
                        ? "1px solid rgba(170,255,0,0.3)"
                        : "1px solid rgba(0,221,255,0.2)",
                    }}
                  >
                    <p className="font-mono text-xs text-white break-words">
                      {msg.text}
                    </p>
                  </div>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOwn(msg.id)}
                      className="text-[9px] font-mono opacity-30 hover:opacity-70 transition-opacity mt-1"
                      style={{ color: "#FF0050" }}
                      title="Delete message"
                    >
                      ×
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "rgba(0,221,255,0.2)" }}
        >
          {isAuthenticated ? (
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Say something..."
                maxLength={200}
                className="flex-1 font-mono text-xs bg-transparent border-border/30 focus:border-[#00DDFF]/50"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                className="font-display font-black text-xs px-3 border-none"
                style={{
                  background:
                    sending || !newMessage.trim()
                      ? "rgba(255,255,255,0.1)"
                      : "linear-gradient(135deg, #00DDFF, #AA00FF)",
                  color: "#06060f",
                }}
              >
                {sending ? "..." : "SEND"}
              </Button>
            </div>
          ) : (
            <p className="text-center font-mono text-xs text-muted-foreground">
              Sign in to chat
            </p>
          )}
        </div>
      </motion.div>

      {/* Admin password popup */}
      <AnimatePresence>
        {adminPasswordTarget !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80"
              style={{ zIndex: 60 }}
              onClick={() => {
                setAdminPasswordTarget(null);
                setAdminPassword("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-8 top-1/2 -translate-y-1/2 p-5 rounded-sm flex flex-col gap-4"
              style={{
                zIndex: 70,
                background: "#06060f",
                border: "2px solid rgba(255,0,170,0.6)",
                boxShadow: "0 0 30px rgba(255,0,170,0.3)",
              }}
            >
              <p
                className="font-display font-black text-center text-sm tracking-wide"
                style={{ color: "#FF00AA" }}
              >
                ADMIN DELETE
              </p>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdminDelete();
                }}
                placeholder="Enter admin password"
                className="font-mono text-xs bg-transparent"
                style={{ borderColor: "rgba(255,0,170,0.4)" }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdminDelete}
                  disabled={submittingAdmin || !adminPassword}
                  className="flex-1 py-2 font-display font-black text-xs rounded-sm"
                  style={{
                    background: "#000",
                    border: "2px solid #FF1493",
                    color: "#FF1493",
                    fontWeight: 700,
                    boxShadow: "0 0 8px rgba(255,20,147,0.4)",
                  }}
                >
                  {submittingAdmin ? "..." : "DELETE"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminPasswordTarget(null);
                    setAdminPassword("");
                  }}
                  className="flex-1 py-2 font-mono text-xs rounded-sm"
                  style={{
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#666",
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
