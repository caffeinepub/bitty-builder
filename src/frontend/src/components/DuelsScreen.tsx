import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAcceptDuelChallenge,
  useDuelHistory,
  useMyDuels,
  useMyNickname,
  useOpenDuels,
  usePostDuelChallenge,
} from "../hooks/useQueries";
import type { DuelChallenge } from "../types/duel";
import { getDuelStateName } from "../types/duel";
import { approveIcrc2ForDuel } from "../utils/icrc1";

interface Props {
  onHome: () => void;
  onPlayDuel: (duelId: string) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const WAGER_AMOUNTS = [
  { label: "100", value: 100n * 100_000_000n },
  { label: "500", value: 500n * 100_000_000n },
  { label: "1K", value: 1_000n * 100_000_000n },
  { label: "5K", value: 5_000n * 100_000_000n },
  { label: "10K", value: 10_000n * 100_000_000n },
  { label: "50K", value: 50_000n * 100_000_000n },
];

// Backend canister ID for ICRC-2 approval spender — read from Vite env at build time
const BACKEND_CANISTER_ID: string =
  import.meta.env.VITE_BACKEND_CANISTER_ID ?? "";

function formatAmount(raw: bigint): string {
  const tokens = raw / 100_000_000n;
  if (tokens >= 1_000n) return `${(Number(tokens) / 1000).toFixed(0)}K`;
  return tokens.toString();
}

function timeLeft(expiresAt: bigint): string {
  const nowMs = Date.now();
  const expMs = Number(expiresAt) / 1_000_000;
  const diffMs = expMs - nowMs;
  if (diffMs <= 0) return "Expired";
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

// ── Status helpers ────────────────────────────────────────────────────────────

function getDuelStatusForMe(
  duel: DuelChallenge,
  myPrincipal: string,
): { label: string; color: string; canPlay: boolean } {
  const state = getDuelStateName(duel.state);
  const isChallenger = duel.challenger.toText() === myPrincipal;

  if (state === "open") {
    return { label: "Waiting for opponent", color: "#888", canPlay: false };
  }
  if (state === "matched") {
    // Both accepted — either can play
    return { label: "Ready to play!", color: "#AAFF00", canPlay: true };
  }
  if (state === "challenger_played") {
    if (isChallenger) {
      return {
        label: "Score submitted — waiting for opponent",
        color: "#00DDFF",
        canPlay: false,
      };
    }
    return {
      label: "Opponent played — your turn!",
      color: "#AAFF00",
      canPlay: true,
    };
  }
  if (state === "opponent_played") {
    if (!isChallenger) {
      return {
        label: "Score submitted — waiting for challenger",
        color: "#00DDFF",
        canPlay: false,
      };
    }
    return {
      label: "Opponent played — your turn!",
      color: "#AAFF00",
      canPlay: true,
    };
  }
  if (state === "resolved") {
    const iWon = duel.winnerId[0]?.toText() === myPrincipal;
    return {
      label: iWon ? "You WON! 🏆" : "You lost",
      color: iWon ? "#AAFF00" : "#FF00AA",
      canPlay: false,
    };
  }
  if (state === "expired") {
    return { label: "Expired", color: "#555", canPlay: false };
  }
  return { label: state, color: "#888", canPlay: false };
}

// ── Post Duel Modal ───────────────────────────────────────────────────────────

function PostDuelModal({
  onClose,
  myActiveDuelAmounts,
}: {
  onClose: () => void;
  myActiveDuelAmounts: Set<string>;
}) {
  const [selectedAmount, setSelectedAmount] = useState<bigint | null>(null);
  const [step, setStep] = useState<"select" | "approving" | "posting" | "done">(
    "select",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const { identity } = useInternetIdentity();
  const postDuel = usePostDuelChallenge();

  const handlePost = async () => {
    if (!selectedAmount || !identity) return;
    setErrorMsg("");
    setStep("approving");

    // ICRC-2 approve: let backend spend on behalf of user
    const approveResult = await approveIcrc2ForDuel(
      BACKEND_CANISTER_ID,
      selectedAmount,
      identity,
    );
    if ("err" in approveResult) {
      setErrorMsg(approveResult.err);
      setStep("select");
      return;
    }

    setStep("posting");
    try {
      await postDuel.mutateAsync(selectedAmount);
      setStep("done");
      toast.success("Duel challenge posted!");
      setTimeout(onClose, 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to post duel");
      setStep("select");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-sm mx-auto rounded-t-xl sm:rounded-xl p-6 flex flex-col gap-5"
        style={{
          background: "#0a0a1a",
          border: "2px solid #FF6B00",
          boxShadow: "0 0 40px rgba(255,107,0,0.35)",
        }}
        data-ocid="duels.post_modal"
      >
        <div className="flex items-center justify-between">
          <h2
            className="font-display font-black text-xl tracking-widest"
            style={{
              background: "linear-gradient(135deg, #FF6B00, #FF00AA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ⚔️ POST A DUEL
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-lg text-muted-foreground hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="font-mono text-xs" style={{ color: "#888" }}>
          Choose your wager amount in $BITTYICP. Winner takes 90% — 10% funds
          the BITTYICP ecosystem.
        </p>

        {/* Amount grid */}
        <div className="grid grid-cols-3 gap-2">
          {WAGER_AMOUNTS.map(({ label, value }) => {
            const isActive = myActiveDuelAmounts.has(value.toString());
            const isSelected = selectedAmount === value;
            return (
              <button
                key={label}
                type="button"
                onClick={() => !isActive && setSelectedAmount(value)}
                disabled={isActive}
                data-ocid={`duels.amount_${label}`}
                className="py-3 rounded-sm font-display font-black text-sm transition-all"
                style={{
                  background: isSelected
                    ? "linear-gradient(135deg, #FF6B00, #FF00AA)"
                    : isActive
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(255,107,0,0.1)",
                  border: isSelected
                    ? "2px solid #FF6B00"
                    : isActive
                      ? "2px solid rgba(255,255,255,0.1)"
                      : "2px solid rgba(255,107,0,0.4)",
                  color: isSelected ? "#fff" : isActive ? "#444" : "#FF6B00",
                  boxShadow: isSelected
                    ? "0 0 20px rgba(255,107,0,0.5)"
                    : "none",
                  cursor: isActive ? "not-allowed" : "pointer",
                }}
              >
                {label}
                {isActive && (
                  <div className="text-[9px] mt-0.5 opacity-60">ACTIVE</div>
                )}
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <p
            className="font-mono text-xs text-center"
            style={{ color: "#FF0050" }}
          >
            ✗ {errorMsg}
          </p>
        )}

        {step === "done" && (
          <p
            className="font-mono text-xs text-center"
            style={{ color: "#AAFF00" }}
          >
            ✓ Duel posted! Waiting for a challenger...
          </p>
        )}

        <button
          type="button"
          onClick={handlePost}
          disabled={!selectedAmount || step !== "select"}
          data-ocid="duels.post_confirm_button"
          className="w-full py-3 font-display font-black text-sm rounded-sm transition-all disabled:opacity-40"
          style={{
            background:
              selectedAmount && step === "select"
                ? "linear-gradient(135deg, #FF6B00, #FF00AA)"
                : "rgba(255,255,255,0.08)",
            color: "#fff",
            boxShadow:
              selectedAmount && step === "select"
                ? "0 0 20px rgba(255,107,0,0.4)"
                : "none",
          }}
        >
          {step === "approving"
            ? "⏳ Approving tokens..."
            : step === "posting"
              ? "⏳ Posting duel..."
              : step === "done"
                ? "✓ Done!"
                : selectedAmount
                  ? `POST DUEL — ${formatAmount(selectedAmount)} $BITTYICP`
                  : "SELECT AN AMOUNT"}
        </button>
      </motion.div>
    </div>
  );
}

// ── Open Challenges Tab ───────────────────────────────────────────────────────

function OpenChallengesTab({
  duels,
  isLoading,
  myPrincipal,
}: {
  duels: DuelChallenge[];
  isLoading: boolean;
  myPrincipal: string;
}) {
  const acceptMutation = useAcceptDuelChallenge();
  const { identity } = useInternetIdentity();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAccept = async (duel: DuelChallenge) => {
    if (!identity) return;
    setAcceptingId(duel.id);

    // ICRC-2 approve first
    const approveResult = await approveIcrc2ForDuel(
      BACKEND_CANISTER_ID,
      duel.amount,
      identity,
    );
    if ("err" in approveResult) {
      toast.error(approveResult.err);
      setAcceptingId(null);
      return;
    }

    try {
      await acceptMutation.mutateAsync(duel.id);
      toast.success("Duel accepted! Play when ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to accept duel");
    } finally {
      setAcceptingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 mt-2">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-16 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  // Filter out own duels
  const others = duels.filter((d) => d.challenger.toText() !== myPrincipal);

  if (others.length === 0) {
    return (
      <div
        className="text-center py-12 font-mono text-sm"
        style={{ color: "rgba(255,255,255,0.35)" }}
        data-ocid="duels.open.empty_state"
      >
        No open challenges right now.
        <br />
        Post your own duel!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2" data-ocid="duels.open.list">
      {others.map((duel, i) => (
        <motion.div
          key={duel.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-sm p-3 flex items-center justify-between gap-3"
          style={{
            background: "rgba(255,107,0,0.06)",
            border: "1px solid rgba(255,107,0,0.3)",
          }}
          data-ocid={`duels.open.item.${i}`}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className="font-mono text-sm font-bold truncate"
              style={{ color: "#FF6B00" }}
            >
              @{duel.challengerNickname}
            </span>
            <span className="font-mono text-xs" style={{ color: "#888" }}>
              {timeLeft(duel.expiresAt)}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div
                className="font-display font-black text-base"
                style={{
                  color: "#FF00AA",
                  textShadow: "0 0 8px rgba(255,0,170,0.5)",
                }}
              >
                {formatAmount(duel.amount)}
              </div>
              <div className="font-mono text-[9px]" style={{ color: "#555" }}>
                $BITTYICP
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAccept(duel)}
              disabled={acceptingId === duel.id}
              data-ocid="duels.accept_button"
              className="px-3 py-2 font-display font-black text-xs rounded-sm transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #FF6B00, #FF00AA)",
                color: "#fff",
                boxShadow: "0 0 12px rgba(255,107,0,0.4)",
              }}
            >
              {acceptingId === duel.id ? "..." : "ACCEPT"}
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── My Duels Tab ─────────────────────────────────────────────────────────────

function MyDuelsTab({
  duels,
  isLoading,
  myPrincipal,
  onPlayDuel,
}: {
  duels: DuelChallenge[];
  isLoading: boolean;
  myPrincipal: string;
  onPlayDuel: (duelId: string) => void;
}) {
  const [showPostModal, setShowPostModal] = useState(false);
  const myActiveDuelAmounts = new Set(
    duels
      .filter((d) => {
        const state = getDuelStateName(d.state);
        return state !== "resolved" && state !== "expired";
      })
      .map((d) => d.amount.toString()),
  );

  if (isLoading) {
    return (
      <div className="space-y-2 mt-2">
        {["a", "b"].map((k) => (
          <Skeleton key={k} className="h-20 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Post a duel CTA */}
      <button
        type="button"
        onClick={() => setShowPostModal(true)}
        data-ocid="duels.post_button"
        className="w-full py-4 mt-2 font-display font-black text-base rounded-sm transition-all"
        style={{
          background: "linear-gradient(135deg, #FF6B00, #FF00AA)",
          color: "#fff",
          boxShadow: "0 0 24px rgba(255,107,0,0.4), 0 4px 0 rgba(0,0,0,0.4)",
        }}
      >
        ⚔️ POST A DUEL
      </button>

      {duels.length === 0 && (
        <div
          className="text-center py-8 font-mono text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }}
          data-ocid="duels.mine.empty_state"
        >
          No active duels yet.
          <br />
          Post a challenge above!
        </div>
      )}

      <div className="flex flex-col gap-2 mt-2" data-ocid="duels.mine.list">
        {duels.map((duel, i) => {
          const status = getDuelStatusForMe(duel, myPrincipal);
          const opponentName = duel.opponentNickname[0] ?? "...";
          const isChallenger = duel.challenger.toText() === myPrincipal;
          const state = getDuelStateName(duel.state);

          return (
            <motion.div
              key={duel.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-sm p-3 flex flex-col gap-2"
              style={{
                background: "rgba(0,0,0,0.35)",
                border: `1px solid ${status.color}33`,
              }}
              data-ocid={`duels.mine.item.${i}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-xs" style={{ color: "#555" }}>
                    vs
                  </span>
                  <span
                    className="font-mono text-sm font-bold truncate"
                    style={{ color: "#FF6B00" }}
                  >
                    {state === "open"
                      ? "Awaiting opponent..."
                      : isChallenger
                        ? `@${opponentName}`
                        : `@${duel.challengerNickname}`}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="font-display font-black text-base"
                    style={{
                      color: "#FF00AA",
                      textShadow: "0 0 8px rgba(255,0,170,0.4)",
                    }}
                  >
                    {formatAmount(duel.amount)}
                  </div>
                  <div
                    className="font-mono text-[9px]"
                    style={{ color: "#555" }}
                  >
                    $BITTYICP
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-mono text-xs font-bold"
                  style={{
                    color: status.color,
                    textShadow: `0 0 8px ${status.color}60`,
                  }}
                >
                  {status.label}
                </span>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: "#555" }}
                >
                  {timeLeft(duel.expiresAt)}
                </span>
              </div>

              {status.canPlay && (
                <button
                  type="button"
                  onClick={() => onPlayDuel(duel.id)}
                  data-ocid="duels.play_button"
                  className="w-full py-2.5 font-display font-black text-sm rounded-sm transition-all"
                  style={{
                    background: "linear-gradient(135deg, #AAFF00, #00DDFF)",
                    color: "#06060f",
                    boxShadow: "0 0 16px rgba(170,255,0,0.5)",
                  }}
                >
                  ▶ PLAY NOW
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {showPostModal && (
        <PostDuelModal
          onClose={() => setShowPostModal(false)}
          myActiveDuelAmounts={myActiveDuelAmounts}
        />
      )}
    </>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab({
  duels,
  isLoading,
  myPrincipal,
}: {
  duels: DuelChallenge[];
  isLoading: boolean;
  myPrincipal: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 mt-2">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-20 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  if (duels.length === 0) {
    return (
      <div
        className="text-center py-12 font-mono text-sm"
        style={{ color: "rgba(255,255,255,0.35)" }}
        data-ocid="duels.history.empty_state"
      >
        No completed duels yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2" data-ocid="duels.history.list">
      {duels.map((duel, i) => {
        const status = getDuelStatusForMe(duel, myPrincipal);
        const isChallenger = duel.challenger.toText() === myPrincipal;
        const myScore = isChallenger
          ? duel.challengerScore[0]
          : duel.opponentScore[0];
        const theirScore = isChallenger
          ? duel.opponentScore[0]
          : duel.challengerScore[0];
        const opponentName = isChallenger
          ? (duel.opponentNickname[0] ?? "???")
          : duel.challengerNickname;
        const state = getDuelStateName(duel.state);
        const iWon = duel.winnerId[0]?.toText() === myPrincipal;
        const payout = iWon ? (duel.amount * 2n * 90n) / 100n : 0n;

        return (
          <motion.div
            key={duel.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-sm p-3 flex flex-col gap-2"
            style={{
              background: iWon
                ? "rgba(170,255,0,0.06)"
                : state === "expired"
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(255,0,170,0.04)",
              border: `1px solid ${status.color}33`,
            }}
            data-ocid={`duels.history.item.${i}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-xs" style={{ color: "#555" }}>
                  vs @{opponentName}
                </span>
                <span
                  className="font-mono text-sm font-bold"
                  style={{
                    color: status.color,
                    textShadow: `0 0 6px ${status.color}50`,
                  }}
                >
                  {status.label}
                </span>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-display font-black text-base"
                  style={{ color: "#FF00AA" }}
                >
                  {formatAmount(duel.amount)}
                </div>
                <div className="font-mono text-[9px]" style={{ color: "#555" }}>
                  $BITTYICP
                </div>
              </div>
            </div>

            {state !== "expired" &&
              (myScore !== undefined || theirScore !== undefined) && (
                <div
                  className="flex gap-4 pt-1"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <div
                      className="font-mono text-[10px]"
                      style={{ color: "#555" }}
                    >
                      YOUR SCORE
                    </div>
                    <div
                      className="font-mono text-sm font-bold"
                      style={{ color: "#AAFF00" }}
                    >
                      {myScore !== undefined
                        ? Number(myScore).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div
                      className="font-mono text-[10px]"
                      style={{ color: "#555" }}
                    >
                      THEIR SCORE
                    </div>
                    <div
                      className="font-mono text-sm font-bold"
                      style={{ color: "#00DDFF" }}
                    >
                      {theirScore !== undefined
                        ? Number(theirScore).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                  {iWon && payout > 0n && (
                    <div className="ml-auto text-right">
                      <div
                        className="font-mono text-[10px]"
                        style={{ color: "#555" }}
                      >
                        PAYOUT
                      </div>
                      <div
                        className="font-mono text-sm font-bold"
                        style={{ color: "#AAFF00" }}
                      >
                        +{formatAmount(payout)}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DuelsScreen({ onHome, onPlayDuel }: Props) {
  const [activeTab, setActiveTab] = useState("mine");
  const { identity } = useInternetIdentity();
  const { data: myNickname } = useMyNickname();
  const myPrincipal = identity?.getPrincipal().toText() ?? "";

  const openDuels = useOpenDuels();
  const myDuels = useMyDuels();
  const history = useDuelHistory();

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,107,0,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(255,0,170,0.06) 0%, transparent 50%), #06060f",
      }}
    >
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-5">
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
            background: "linear-gradient(135deg, #FF6B00, #FF00AA)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 12px rgba(255,107,0,0.4))",
          }}
        >
          ⚔️ DUELS
        </h1>
        <div className="w-12" />
      </div>

      {/* Signed-in status */}
      {myNickname && (
        <div className="w-full max-w-md mb-3">
          <div
            className="rounded-sm px-3 py-2 flex items-center gap-2"
            style={{
              background: "rgba(255,107,0,0.08)",
              border: "1px solid rgba(255,107,0,0.25)",
            }}
          >
            <span className="font-mono text-xs" style={{ color: "#FF6B00" }}>
              ⚔️ Playing as @{myNickname}
            </span>
            <span
              className="font-mono text-xs ml-auto"
              style={{ color: "#555" }}
            >
              10% of winnings support the BITTYICP ecosystem
            </span>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="w-full max-w-md mb-4">
        <div
          className="rounded-sm px-3 py-2.5"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            className="font-mono text-xs leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Wager $BITTYICP against another player. Both play separately —
            highest score wins 90% of the pot. Duels expire after 24 hours if
            unmatched or unplayed.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="w-full rounded-sm bg-muted/20"
            data-ocid="duels.tab"
          >
            <TabsTrigger
              value="open"
              className="flex-1 font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#FF6B00]"
            >
              Open
            </TabsTrigger>
            <TabsTrigger
              value="mine"
              className="flex-1 font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#AAFF00]"
            >
              My Duels
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#AA00FF]"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-3">
            <OpenChallengesTab
              duels={openDuels.data ?? []}
              isLoading={openDuels.isLoading}
              myPrincipal={myPrincipal}
            />
          </TabsContent>

          <TabsContent value="mine" className="mt-3">
            <MyDuelsTab
              duels={myDuels.data ?? []}
              isLoading={myDuels.isLoading}
              myPrincipal={myPrincipal}
              onPlayDuel={onPlayDuel}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <HistoryTab
              duels={history.data ?? []}
              isLoading={history.isLoading}
              myPrincipal={myPrincipal}
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
