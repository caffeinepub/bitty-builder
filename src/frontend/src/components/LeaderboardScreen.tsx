import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LeaderboardEntry } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  useAllTimeLeaderboard,
  useWeeklyLeaderboard,
} from "../hooks/useQueries";

interface Props {
  onPlay: () => void;
  onHome: () => void;
}

const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"];

function formatDate(ts: bigint) {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatScore(score: bigint) {
  return Number(score).toLocaleString();
}

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  };
  if (medals[rank]) {
    return <span className="text-lg">{medals[rank]}</span>;
  }
  return (
    <span className="font-mono text-sm text-muted-foreground">#{rank}</span>
  );
}

function LeaderboardTable({
  entries,
  isLoading,
  emptyMessage,
}: {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 mt-2" data-ocid="leaderboard.loading_state">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-10 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className="text-center py-12 font-mono text-sm text-muted-foreground"
        data-ocid="leaderboard.empty_state"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table data-ocid="leaderboard.table">
      <TableHeader>
        <TableRow className="border-border/30 hover:bg-transparent">
          <TableHead className="font-mono text-xs text-muted-foreground w-12">
            Rank
          </TableHead>
          <TableHead className="font-mono text-xs text-muted-foreground">
            Player
          </TableHead>
          <TableHead className="font-mono text-xs text-muted-foreground text-right">
            Score
          </TableHead>
          <TableHead className="font-mono text-xs text-muted-foreground text-right hidden sm:table-cell">
            Date
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.slice(0, 10).map((entry, i) => (
          <motion.tr
            key={`${entry.nickname}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            data-ocid={`leaderboard.item.${i + 1}`}
            className="border-border/20 hover:bg-muted/20"
          >
            <TableCell className="py-2">
              <RankBadge rank={Number(entry.rank)} />
            </TableCell>
            <TableCell className="py-2">
              <span
                className="font-mono text-sm font-semibold"
                style={{
                  color:
                    i === 0
                      ? "#FFE500"
                      : i === 1
                        ? "#C0C0C0"
                        : i === 2
                          ? "#CD7F32"
                          : "inherit",
                }}
              >
                {entry.nickname}
              </span>
            </TableCell>
            <TableCell className="py-2 text-right">
              <span className="font-mono text-sm" style={{ color: "#AAFF00" }}>
                {formatScore(entry.score)}
              </span>
            </TableCell>
            <TableCell className="py-2 text-right hidden sm:table-cell">
              <span className="font-mono text-xs text-muted-foreground">
                {formatDate(entry.timestamp)}
              </span>
            </TableCell>
          </motion.tr>
        ))}
      </TableBody>
    </Table>
  );
}

// Admin password overlay
function AdminPasswordOverlay({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (password === "bittybittywhatwhat") {
      setError("");
      onSuccess();
    } else {
      setError("Wrong password");
    }
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center w-full h-full max-w-none max-h-none p-0 m-0 border-0"
      style={{ background: "rgba(6,6,15,0.92)" }}
      aria-label="Admin access"
      onClose={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-80 rounded-sm p-6 flex flex-col gap-4"
        style={{
          background: "#0a0a1a",
          border: "2px solid #FF00AA",
          boxShadow: "0 0 40px rgba(255,0,170,0.4)",
        }}
      >
        <h2
          className="font-display font-black text-xl text-center tracking-widest"
          style={{
            background: "linear-gradient(135deg, #FF00AA, #FF4500)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          🔐 ADMIN ACCESS
        </h2>

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Enter password"
          data-ocid="admin.input"
          className="w-full px-3 py-2 rounded-sm font-mono text-sm bg-transparent outline-none"
          style={{
            border: "1px solid #FF00AA",
            color: "#fff",
          }}
        />

        {error && (
          <p
            className="font-mono text-xs text-center"
            style={{ color: "#FF0050" }}
            data-ocid="admin.error_state"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            data-ocid="admin.cancel_button"
            className="flex-1 py-2 font-mono text-xs rounded-sm transition-opacity hover:opacity-70"
            style={{ border: "1px solid #555", color: "#aaa" }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            data-ocid="admin.submit_button"
            className="flex-1 py-2 font-display font-black text-xs rounded-sm transition-opacity hover:opacity-80"
            style={{
              background: "linear-gradient(135deg, #FF00AA, #FF4500)",
              color: "#fff",
            }}
          >
            UNLOCK
          </button>
        </div>
      </motion.div>
    </dialog>
  );
}

// Admin panel modal
function AdminPanel({
  onClose,
  onInteraction,
  weeklyRefetch,
}: {
  onClose: () => void;
  onInteraction: () => void;
  weeklyRefetch: () => void;
}) {
  const { actor } = useActor();
  const [resetStatus, setResetStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [resetTimeValue, setResetTimeValue] = useState("");
  const [timeStatus, setTimeStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async () => {
    if (!actor) return;
    onInteraction();
    setResetStatus("loading");
    try {
      await (actor as any).adminResetWeeklyLeaderboard("bittybittywhatwhat");
      setResetStatus("success");
      weeklyRefetch();
    } catch {
      setResetStatus("error");
    }
  };

  const handleSetTime = async () => {
    if (!actor || !resetTimeValue) return;
    onInteraction();
    setTimeStatus("loading");
    setErrorMsg("");
    try {
      const tsNs = BigInt(new Date(resetTimeValue).getTime()) * 1_000_000n;
      await (actor as any).adminSetWeeklyResetTime("bittybittywhatwhat", tsNs);
      setTimeStatus("success");
    } catch (e) {
      setTimeStatus("error");
      setErrorMsg(String(e));
    }
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center w-full h-full max-w-none max-h-none p-0 m-0 border-0"
      style={{ background: "rgba(6,6,15,0.85)" }}
      aria-label="Admin panel"
      onClose={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        onClick={onInteraction}
        className="w-full max-w-sm mx-4 rounded-sm p-5 flex flex-col gap-5"
        style={{
          background: "#0a0a1a",
          border: "2px solid #00DDFF",
          boxShadow: "0 0 50px rgba(0,221,255,0.3)",
        }}
        data-ocid="admin.panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            className="font-display font-black text-lg tracking-widest"
            style={{
              background: "linear-gradient(135deg, #00DDFF, #AAFF00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ⚙️ ADMIN PANEL
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-ocid="admin.close_button"
            className="font-mono text-lg text-muted-foreground hover:text-white transition-colors leading-none"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Reset */}
        <div
          className="rounded-sm p-4 flex flex-col gap-3"
          style={{
            background: "rgba(255,0,80,0.06)",
            border: "1px solid rgba(255,0,80,0.3)",
          }}
        >
          <p
            className="font-display font-black text-sm"
            style={{ color: "#FF0050" }}
          >
            RESET WEEKLY LEADERBOARD
          </p>
          <p className="font-mono text-xs" style={{ color: "#888" }}>
            This will clear all current weekly scores.
          </p>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetStatus === "loading"}
            data-ocid="admin.primary_button"
            className="w-full py-2.5 font-display font-black text-sm rounded-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FF0050, #FF4500)",
              color: "#fff",
            }}
          >
            {resetStatus === "loading" ? "RESETTING..." : "RESET NOW"}
          </button>
          {resetStatus === "success" && (
            <p
              className="font-mono text-xs text-center"
              style={{ color: "#AAFF00" }}
              data-ocid="admin.success_state"
            >
              ✓ Weekly leaderboard cleared!
            </p>
          )}
          {resetStatus === "error" && (
            <p
              className="font-mono text-xs text-center"
              style={{ color: "#FF0050" }}
              data-ocid="admin.error_state"
            >
              ✗ Reset failed. Try again.
            </p>
          )}
        </div>

        {/* Section 2: Set reset time */}
        <div
          className="rounded-sm p-4 flex flex-col gap-3"
          style={{
            background: "rgba(0,221,255,0.04)",
            border: "1px solid rgba(0,221,255,0.25)",
          }}
        >
          <p
            className="font-display font-black text-sm"
            style={{ color: "#00DDFF" }}
          >
            SET NEXT RESET DATE & TIME
          </p>
          <input
            type="datetime-local"
            value={resetTimeValue}
            onChange={(e) => {
              setResetTimeValue(e.target.value);
              setTimeStatus("idle");
            }}
            data-ocid="admin.input"
            className="w-full px-3 py-2 rounded-sm font-mono text-sm bg-transparent outline-none"
            style={{
              border: "1px solid #00DDFF",
              color: "#fff",
              colorScheme: "dark",
            }}
          />
          <button
            type="button"
            onClick={handleSetTime}
            disabled={timeStatus === "loading" || !resetTimeValue}
            data-ocid="admin.secondary_button"
            className="w-full py-2.5 font-display font-black text-sm rounded-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #00DDFF, #AAFF00)",
              color: "#06060f",
            }}
          >
            {timeStatus === "loading" ? "UPDATING..." : "UPDATE RESET TIME"}
          </button>
          {timeStatus === "success" && (
            <p
              className="font-mono text-xs text-center"
              style={{ color: "#AAFF00" }}
            >
              ✓ Reset time updated!
            </p>
          )}
          {timeStatus === "error" && (
            <p
              className="font-mono text-xs text-center"
              style={{ color: "#FF0050" }}
            >
              ✗ {errorMsg || "Failed to update. Try again."}
            </p>
          )}
        </div>

        <p className="font-mono text-xs text-center" style={{ color: "#444" }}>
          Admin session expires after 5 min of inactivity
        </p>
      </motion.div>
    </dialog>
  );
}

export default function LeaderboardScreen({ onPlay, onHome }: Props) {
  const [activeTab, setActiveTab] = useState("weekly");
  const weekly = useWeeklyLeaderboard();
  const allTime = useAllTimeLeaderboard();

  // Admin state
  const [_tapCount, setTapCount] = useState(0);
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminExpireRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAdminSession = useCallback(() => {
    if (adminExpireRef.current) clearTimeout(adminExpireRef.current);
    adminExpireRef.current = setTimeout(
      () => {
        setShowAdminPanel(false);
      },
      5 * 60 * 1000,
    );
  }, []);

  const handleOpenAdminPanel = useCallback(() => {
    setShowPasswordOverlay(false);
    setShowAdminPanel(true);
    resetAdminSession();
  }, [resetAdminSession]);

  const handleCloseAdminPanel = useCallback(() => {
    setShowAdminPanel(false);
    if (adminExpireRef.current) clearTimeout(adminExpireRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (adminExpireRef.current) clearTimeout(adminExpireRef.current);
    };
  }, []);

  const handleScreenTap = useCallback(() => {
    if (showPasswordOverlay || showAdminPanel) return;

    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        setShowPasswordOverlay(true);
        return 0;
      }
      // Reset after 3s of no taps
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => setTapCount(0), 3000);
      return next;
    });
  }, [showPasswordOverlay, showAdminPanel]);

  const handleScreenKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") handleScreenTap();
    },
    [handleScreenTap],
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,0,170,0.07) 0%, transparent 60%), #06060f",
      }}
      onClick={handleScreenTap}
      onKeyDown={handleScreenKey}
    >
      {/* Password Overlay */}
      <AnimatePresence>
        {showPasswordOverlay && (
          <AdminPasswordOverlay
            onSuccess={handleOpenAdminPanel}
            onClose={() => {
              setShowPasswordOverlay(false);
              setTapCount(0);
            }}
          />
        )}
      </AnimatePresence>

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel
            onClose={handleCloseAdminPanel}
            onInteraction={resetAdminSession}
            weeklyRefetch={() => weekly.refetch()}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onHome}
          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <h1
          className="font-display font-black text-2xl"
          style={{
            background: "linear-gradient(135deg, #FF00AA, #AAFF00)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          🏆 LEADERBOARD
        </h1>
        <button
          type="button"
          onClick={onPlay}
          data-ocid="game.play_button"
          className="btn-arcade px-3 py-1.5 text-xs font-display font-black rounded-sm"
          style={{
            background: "linear-gradient(135deg, #AAFF00, #00DDFF)",
            color: "#06060f",
          }}
        >
          PLAY
        </button>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="w-full rounded-sm bg-muted/20"
            data-ocid="leaderboard.tab"
          >
            <TabsTrigger
              value="weekly"
              className="flex-1 font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#FF00AA]"
            >
              This Week
            </TabsTrigger>
            <TabsTrigger
              value="alltime"
              className="flex-1 font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#AAFF00]"
            >
              All Time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-3">
            {/* Tournament active banner */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mb-3 px-3 py-2.5 rounded-sm flex items-center justify-center gap-2"
              style={{
                background: "rgba(255, 0, 80, 0.12)",
                border: "2px solid rgba(255, 0, 80, 0.6)",
                boxShadow:
                  "0 0 18px rgba(255,0,80,0.25), inset 0 0 12px rgba(255,0,80,0.08)",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>⚡</span>
              <span
                className="font-display font-black text-sm tracking-wide uppercase"
                style={{
                  background:
                    "linear-gradient(90deg, #FF0050, #FF00AA, #FF4500)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 6px rgba(255,0,80,0.6))",
                }}
              >
                TOURNAMENT ACTIVE — RESETS APR 4 AT 9 PM UTC
              </span>
              <span style={{ fontSize: "1.1rem" }}>⚡</span>
            </motion.div>
            <LeaderboardTable
              entries={weekly.data ?? []}
              isLoading={weekly.isLoading}
              emptyMessage="No scores this week yet. Be the first!"
            />
          </TabsContent>

          <TabsContent value="alltime" className="mt-2">
            <LeaderboardTable
              entries={allTime.data ?? []}
              isLoading={allTime.isLoading}
              emptyMessage="No scores yet. Be the first champion!"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-8 text-center">
        <a
          href="https://bittyonicp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-display font-black text-3xl tracking-wider transition-opacity hover:opacity-80"
          style={{
            background:
              "linear-gradient(135deg, #AAFF00 0%, #00DDFF 50%, #FF00AA 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 12px rgba(170,255,0,0.5))",
          }}
        >
          BITTYONICP.COM
        </a>
      </footer>
    </div>
  );
}
