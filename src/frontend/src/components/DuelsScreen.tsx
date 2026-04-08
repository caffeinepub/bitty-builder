import { Skeleton } from "@/components/ui/skeleton";
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
  { label: "100", value: 100n * 100_000_000n, color: "#AAFF00" },
  { label: "500", value: 500n * 100_000_000n, color: "#00DDFF" },
  { label: "1K", value: 1_000n * 100_000_000n, color: "#FF00AA" },
  { label: "5K", value: 5_000n * 100_000_000n, color: "#FF6B00" },
  { label: "10K", value: 10_000n * 100_000_000n, color: "#AA00FF" },
  { label: "50K", value: 50_000n * 100_000_000n, color: "#FF00AA" },
];

// Backend canister ID — use CANISTER_ID_BACKEND which vite-plugin-environment injects from process.env
const BACKEND_CANISTER_ID: string =
  (import.meta.env.CANISTER_ID_BACKEND as string) ?? "";

function formatAmount(raw: bigint): string {
  const tokens = raw / 100_000_000n;
  if (tokens >= 1_000n) return `${(Number(tokens) / 1000).toFixed(0)}K`;
  return tokens.toString();
}

function timeLeft(expiresAt: bigint): string {
  const nowMs = Date.now();
  const expMs = Number(expiresAt) / 1_000_000;
  const diffMs = expMs - nowMs;
  if (diffMs <= 0) return "EXPIRED";
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  if (h > 0) return `${h}H ${m}M LEFT`;
  return `${m}M LEFT`;
}

// ── Arcade UI Primitives ──────────────────────────────────────────────────────

function ArcadePanel({
  children,
  borderColor = "#FF00AA",
  className = "",
}: {
  children: React.ReactNode;
  borderColor?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "#080810",
        border: `4px solid ${borderColor}`,
        boxShadow: `0 0 0 1px #000, 0 0 16px ${borderColor}55, inset 0 0 20px rgba(0,0,0,0.8)`,
        borderRadius: 0,
      }}
    >
      {children}
    </div>
  );
}

function ArcadeButton({
  onClick,
  disabled,
  color,
  children,
  className = "",
  fullWidth = false,
  "data-ocid": dataOcid,
}: {
  onClick?: () => void;
  disabled?: boolean;
  color: string;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  "data-ocid"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-ocid={dataOcid}
      className={`font-mono font-black uppercase tracking-widest transition-all ${fullWidth ? "w-full" : ""} ${className}`}
      style={{
        background: disabled ? "#111118" : "#06060f",
        border: `4px solid ${disabled ? "#333" : color}`,
        color: disabled ? "#444" : color,
        textShadow: disabled
          ? "none"
          : `0 0 10px ${color}, 0 0 20px ${color}88`,
        boxShadow: disabled ? "none" : `0 0 12px ${color}44, 4px 4px 0 #000`,
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 0,
        padding: "10px 16px",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      className="font-mono font-black text-xs uppercase tracking-widest px-2 py-0.5"
      style={{
        background: `${color}22`,
        border: `2px solid ${color}`,
        color,
        textShadow: `0 0 8px ${color}`,
        borderRadius: 0,
      }}
    >
      {label}
    </span>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────

function getDuelStatusForMe(
  duel: DuelChallenge,
  myPrincipal: string,
): { label: string; color: string; canPlay: boolean } {
  const state = getDuelStateName(duel.state);
  const isChallenger = duel.challenger.toText() === myPrincipal;

  if (state === "open") {
    return { label: "WAITING FOR OPPONENT", color: "#FF6B00", canPlay: false };
  }
  if (state === "matched") {
    return { label: "READY TO PLAY!", color: "#AAFF00", canPlay: true };
  }
  if (state === "challenger_played") {
    if (isChallenger) {
      return { label: "SCORE IN — WAITING", color: "#00DDFF", canPlay: false };
    }
    return {
      label: "OPPONENT PLAYED — YOUR TURN!",
      color: "#AAFF00",
      canPlay: true,
    };
  }
  if (state === "opponent_played") {
    if (!isChallenger) {
      return { label: "SCORE IN — WAITING", color: "#00DDFF", canPlay: false };
    }
    return {
      label: "OPPONENT PLAYED — YOUR TURN!",
      color: "#AAFF00",
      canPlay: true,
    };
  }
  if (state === "resolved") {
    const iWon = duel.winnerId?.[0]?.toText() === myPrincipal;
    return {
      label: iWon ? "YOU WON! 🏆" : "YOU LOST",
      color: iWon ? "#AAFF00" : "#FF0050",
      canPlay: false,
    };
  }
  if (state === "expired") {
    return { label: "EXPIRED", color: "#FF6B00", canPlay: false };
  }
  return { label: state.toUpperCase(), color: "#888", canPlay: false };
}

// ── Post Duel Modal ───────────────────────────────────────────────────────────

function PostDuelModal({
  onClose,
  myActiveDuelAmounts,
}: {
  onClose: () => void;
  myActiveDuelAmounts: Set<string>;
}) {
  const [selectedAmount, setSelectedAmount] = useState<{
    value: bigint;
    color: string;
    label: string;
  } | null>(null);
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

    const approveResult = await approveIcrc2ForDuel(
      BACKEND_CANISTER_ID,
      selectedAmount.value,
      identity,
    );
    if ("err" in approveResult) {
      setErrorMsg(approveResult.err);
      setStep("select");
      return;
    }

    setStep("posting");
    try {
      await postDuel.mutateAsync(selectedAmount.value);
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
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-sm mx-auto"
        data-ocid="duels.post_modal"
      >
        <ArcadePanel borderColor="#FF00AA" className="p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2
              className="font-mono font-black text-xl tracking-widest uppercase"
              style={{
                color: "#FF00AA",
                textShadow: "0 0 10px #FF00AA, 0 0 20px #FF00AA88",
              }}
            >
              ⚔ POST A DUEL
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="font-mono font-black text-lg"
              style={{ color: "#FF00AA", background: "none", border: "none" }}
            >
              ✕
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 2,
              background: "linear-gradient(90deg, #FF00AA, #AA00FF, #00DDFF)",
            }}
          />

          <p
            className="font-mono text-xs tracking-wide uppercase"
            style={{ color: "#888" }}
          >
            Choose wager in $BITTYICP. Winner takes 90% — 10% funds BITTYICP
            ecosystem.
          </p>

          {/* Amount grid */}
          <div className="grid grid-cols-3 gap-2">
            {WAGER_AMOUNTS.map(({ label, value, color }) => {
              const isActive = myActiveDuelAmounts.has(value.toString());
              const isSelected = selectedAmount?.value === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    !isActive && setSelectedAmount({ value, color, label })
                  }
                  disabled={isActive}
                  data-ocid={`duels.amount_${label}`}
                  className="py-3 font-mono font-black text-sm uppercase tracking-widest transition-all flex flex-col items-center"
                  style={{
                    background: isSelected
                      ? `${color}22`
                      : isActive
                        ? "#111"
                        : "#06060f",
                    border: `4px solid ${isSelected ? color : isActive ? "#222" : `${color}55`}`,
                    color: isSelected
                      ? color
                      : isActive
                        ? "#333"
                        : `${color}99`,
                    textShadow: isSelected ? `0 0 10px ${color}` : "none",
                    boxShadow: isSelected
                      ? `0 0 16px ${color}55, 4px 4px 0 #000`
                      : "4px 4px 0 #000",
                    cursor: isActive ? "not-allowed" : "pointer",
                    borderRadius: 0,
                  }}
                >
                  {label}
                  {isActive && (
                    <div
                      className="text-[9px] mt-0.5"
                      style={{ color: "#FF6B00" }}
                    >
                      ACTIVE
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div
              className="font-mono text-xs text-center py-2 px-3"
              style={{
                color: "#FF0050",
                border: "2px solid #FF005055",
                background: "#FF005011",
                letterSpacing: "0.05em",
              }}
            >
              ✗ {errorMsg}
            </div>
          )}

          {step === "done" && (
            <div
              className="font-mono text-xs text-center py-2"
              style={{ color: "#AAFF00", textShadow: "0 0 8px #AAFF00" }}
            >
              ✓ DUEL POSTED! WAITING FOR CHALLENGER...
            </div>
          )}

          <ArcadeButton
            onClick={handlePost}
            disabled={!selectedAmount || step !== "select"}
            color={selectedAmount?.color ?? "#FF00AA"}
            fullWidth
            data-ocid="duels.post_confirm_button"
            className="py-4 text-base"
          >
            {step === "approving"
              ? "⏳ APPROVING TOKENS..."
              : step === "posting"
                ? "⏳ POSTING DUEL..."
                : step === "done"
                  ? "✓ DONE!"
                  : selectedAmount
                    ? `POST DUEL — ${selectedAmount.label} $BITTYICP`
                    : "SELECT AN AMOUNT"}
          </ArcadeButton>
        </ArcadePanel>
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
          <Skeleton
            key={k}
            className="h-16 w-full"
            style={{ borderRadius: 0 }}
          />
        ))}
      </div>
    );
  }

  const others = duels.filter((d) => d.challenger.toText() !== myPrincipal);

  if (others.length === 0) {
    return (
      <div
        className="text-center py-12 font-mono text-sm uppercase tracking-widest"
        style={{ color: "#444" }}
        data-ocid="duels.open.empty_state"
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚔</div>
        NO OPEN CHALLENGES
        <br />
        <span style={{ color: "#FF6B00" }}>POST YOUR OWN DUEL!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2" data-ocid="duels.open.list">
      {others.map((duel, i) => {
        const amountColor =
          WAGER_AMOUNTS.find((w) => w.value === duel.amount)?.color ??
          "#FF00AA";
        return (
          <motion.div
            key={duel.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            data-ocid={`duels.open.item.${i}`}
          >
            <ArcadePanel
              borderColor={amountColor}
              className="p-3 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className="font-mono text-sm font-black truncate uppercase tracking-wide"
                  style={{ color: "#FF6B00", textShadow: "0 0 8px #FF6B0088" }}
                >
                  @{duel.challengerNickname}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: "#555" }}
                >
                  {timeLeft(duel.expiresAt)}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div
                    className="font-mono font-black text-lg"
                    style={{
                      color: amountColor,
                      textShadow: `0 0 12px ${amountColor}`,
                    }}
                  >
                    {formatAmount(duel.amount)}
                  </div>
                  <div
                    className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: "#555" }}
                  >
                    $BITTYICP
                  </div>
                </div>
                <ArcadeButton
                  onClick={() => handleAccept(duel)}
                  disabled={acceptingId === duel.id}
                  color="#AAFF00"
                  data-ocid="duels.accept_button"
                  className="text-xs py-2 px-4"
                >
                  {acceptingId === duel.id ? "..." : "ACCEPT"}
                </ArcadeButton>
              </div>
            </ArcadePanel>
          </motion.div>
        );
      })}
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
          <Skeleton
            key={k}
            className="h-20 w-full"
            style={{ borderRadius: 0 }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Post CTA */}
      <div className="mt-2">
        <ArcadeButton
          onClick={() => setShowPostModal(true)}
          color="#AAFF00"
          fullWidth
          data-ocid="duels.post_button"
          className="py-4 text-base"
        >
          ⚔ POST A DUEL
        </ArcadeButton>
      </div>

      {duels.length === 0 && (
        <div
          className="text-center py-8 font-mono text-sm uppercase tracking-widest"
          style={{ color: "#444" }}
          data-ocid="duels.mine.empty_state"
        >
          NO ACTIVE DUELS YET.
          <br />
          <span style={{ color: "#AAFF00" }}>POST A CHALLENGE ABOVE!</span>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-3" data-ocid="duels.mine.list">
        {duels.map((duel, i) => {
          const status = getDuelStatusForMe(duel, myPrincipal);
          const opponentName = duel.opponentNickname?.[0] ?? "...";
          const isChallenger = duel.challenger.toText() === myPrincipal;
          const state = getDuelStateName(duel.state);
          const amountColor =
            WAGER_AMOUNTS.find((w) => w.value === duel.amount)?.color ??
            "#FF00AA";

          return (
            <motion.div
              key={duel.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              data-ocid={`duels.mine.item.${i}`}
            >
              <ArcadePanel
                borderColor={status.color}
                className="p-3 flex flex-col gap-2"
              >
                {/* Top row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span
                      className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: "#555" }}
                    >
                      VS
                    </span>
                    <span
                      className="font-mono text-sm font-black truncate uppercase"
                      style={{
                        color: "#FF6B00",
                        textShadow: "0 0 8px #FF6B0066",
                      }}
                    >
                      {state === "open"
                        ? "AWAITING OPPONENT..."
                        : isChallenger
                          ? `@${opponentName}`
                          : `@${duel.challengerNickname}`}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="font-mono font-black text-lg"
                      style={{
                        color: amountColor,
                        textShadow: `0 0 10px ${amountColor}`,
                      }}
                    >
                      {formatAmount(duel.amount)}
                    </div>
                    <div
                      className="font-mono text-[9px] uppercase tracking-widest"
                      style={{ color: "#555" }}
                    >
                      $BITTYICP
                    </div>
                  </div>
                </div>

                {/* Status + timer row */}
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge label={status.label} color={status.color} />
                  <span
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: "#555" }}
                  >
                    {timeLeft(duel.expiresAt)}
                  </span>
                </div>

                {status.canPlay && (
                  <div className="mt-1">
                    <ArcadeButton
                      onClick={() => onPlayDuel(duel.id)}
                      color="#AAFF00"
                      fullWidth
                      data-ocid="duels.play_button"
                      className="py-3 text-sm"
                    >
                      ▶ PLAY NOW
                    </ArcadeButton>
                  </div>
                )}
              </ArcadePanel>
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
          <Skeleton
            key={k}
            className="h-20 w-full"
            style={{ borderRadius: 0 }}
          />
        ))}
      </div>
    );
  }

  if (duels.length === 0) {
    return (
      <div
        className="text-center py-12 font-mono text-sm uppercase tracking-widest"
        style={{ color: "#444" }}
        data-ocid="duels.history.empty_state"
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
        NO COMPLETED DUELS YET.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2" data-ocid="duels.history.list">
      {duels.map((duel, i) => {
        const status = getDuelStatusForMe(duel, myPrincipal);
        const isChallenger = duel.challenger.toText() === myPrincipal;
        const myScore = isChallenger
          ? duel.challengerScore?.[0]
          : duel.opponentScore?.[0];
        const theirScore = isChallenger
          ? duel.opponentScore?.[0]
          : duel.challengerScore?.[0];
        const opponentName = isChallenger
          ? (duel.opponentNickname?.[0] ?? "???")
          : duel.challengerNickname;
        const state = getDuelStateName(duel.state);
        const iWon = duel.winnerId?.[0]?.toText() === myPrincipal;
        const payout = iWon ? (duel.amount * 2n * 90n) / 100n : 0n;
        const amountColor =
          WAGER_AMOUNTS.find((w) => w.value === duel.amount)?.color ??
          "#FF00AA";

        return (
          <motion.div
            key={duel.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            data-ocid={`duels.history.item.${i}`}
          >
            <ArcadePanel
              borderColor={status.color}
              className="p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: "#555" }}
                  >
                    VS @{opponentName}
                  </span>
                  <StatusBadge label={status.label} color={status.color} />
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="font-mono font-black text-lg"
                    style={{
                      color: amountColor,
                      textShadow: `0 0 10px ${amountColor}`,
                    }}
                  >
                    {formatAmount(duel.amount)}
                  </div>
                  <div
                    className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: "#555" }}
                  >
                    $BITTYICP
                  </div>
                </div>
              </div>

              {state !== "expired" &&
                (myScore !== undefined || theirScore !== undefined) && (
                  <div
                    className="flex gap-4 pt-2"
                    style={{ borderTop: "2px solid #1a1a2e" }}
                  >
                    <div>
                      <div
                        className="font-mono text-[10px] uppercase tracking-widest"
                        style={{ color: "#555" }}
                      >
                        YOUR SCORE
                      </div>
                      <div
                        className="font-mono text-sm font-black"
                        style={{
                          color: "#AAFF00",
                          textShadow: "0 0 8px #AAFF0088",
                        }}
                      >
                        {myScore !== undefined
                          ? Number(myScore).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div
                        className="font-mono text-[10px] uppercase tracking-widest"
                        style={{ color: "#555" }}
                      >
                        THEIR SCORE
                      </div>
                      <div
                        className="font-mono text-sm font-black"
                        style={{
                          color: "#00DDFF",
                          textShadow: "0 0 8px #00DDFF88",
                        }}
                      >
                        {theirScore !== undefined
                          ? Number(theirScore).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    {iWon && payout > 0n && (
                      <div className="ml-auto text-right">
                        <div
                          className="font-mono text-[10px] uppercase tracking-widest"
                          style={{ color: "#555" }}
                        >
                          PAYOUT
                        </div>
                        <div
                          className="font-mono text-sm font-black"
                          style={{
                            color: "#AAFF00",
                            textShadow: "0 0 8px #AAFF00",
                          }}
                        >
                          +{formatAmount(payout)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </ArcadePanel>
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

  const TABS = [
    { id: "open", label: "OPEN", color: "#00DDFF" },
    { id: "mine", label: "MY DUELS", color: "#AAFF00" },
    { id: "history", label: "HISTORY", color: "#AA00FF" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center px-3 py-5"
      style={{
        background: "#06060f",
        backgroundImage: `
          radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,0,170,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 60% 30% at 80% 100%, rgba(0,221,255,0.05) 0%, transparent 50%),
          repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px),
          repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px)
        `,
      }}
    >
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onHome}
          className="font-mono font-black text-sm uppercase tracking-widest transition-all"
          style={{
            color: "#00DDFF",
            textShadow: "0 0 8px #00DDFF88",
            background: "none",
            border: "none",
          }}
        >
          ← BACK
        </button>

        {/* Title */}
        <div className="flex items-center gap-1">
          {(
            [
              { letter: "D", color: "#AAFF00" },
              { letter: "U", color: "#00DDFF" },
              { letter: "E", color: "#FF00AA" },
              { letter: "L", color: "#FF6B00" },
              { letter: "S", color: "#AA00FF" },
            ] as const
          ).map(({ letter, color }) => (
            <span
              key={letter}
              className="font-mono font-black text-3xl"
              style={{
                color,
                textShadow: `0 0 12px ${color}, 0 0 24px ${color}66`,
                letterSpacing: "-0.02em",
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        <div className="w-14" />
      </div>

      {/* Beta badge */}
      <div className="w-full max-w-md mb-3">
        <div className="flex items-center gap-2">
          <div
            className="font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5"
            style={{
              color: "#FF6B00",
              border: "2px solid #FF6B00",
              boxShadow: "0 0 8px #FF6B0044",
              background: "#FF6B0011",
            }}
          >
            ⚠ BETA TESTING
          </div>
          <div
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "#444" }}
          >
            10% OF WINNINGS FUND BITTYICP ECOSYSTEM
          </div>
        </div>
      </div>

      {/* Signed-in status */}
      {myNickname && (
        <div className="w-full max-w-md mb-3">
          <ArcadePanel borderColor="#FF6B00" className="px-3 py-2">
            <span
              className="font-mono text-xs font-black uppercase tracking-widest"
              style={{ color: "#FF6B00", textShadow: "0 0 8px #FF6B0088" }}
            >
              ⚔ PLAYING AS @{myNickname}
            </span>
          </ArcadePanel>
        </div>
      )}

      {/* Info panel */}
      <div className="w-full max-w-md mb-4">
        <ArcadePanel borderColor="#1a1a3a" className="px-3 py-2">
          <p
            className="font-mono text-xs leading-relaxed uppercase tracking-wide"
            style={{ color: "#555" }}
          >
            Wager $BITTYICP — highest score wins 90% of pot. Duels expire in 24h
            if unmatched or unplayed.
          </p>
        </ArcadePanel>
      </div>

      {/* Custom Tab Bar */}
      <div className="w-full max-w-md mb-2" data-ocid="duels.tab">
        <div
          className="grid grid-cols-3 gap-0"
          style={{ border: "4px solid #1a1a3a" }}
        >
          {TABS.map(({ id, label, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className="py-3 font-mono font-black text-xs uppercase tracking-widest transition-all"
              style={{
                background: activeTab === id ? `${color}18` : "#06060f",
                color: activeTab === id ? color : "#444",
                textShadow: activeTab === id ? `0 0 10px ${color}` : "none",
                borderBottom:
                  activeTab === id ? `4px solid ${color}` : "4px solid #111",
                boxShadow:
                  activeTab === id ? `inset 0 -2px 12px ${color}22` : "none",
                borderRadius: 0,
                border: "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="w-full max-w-md">
        {activeTab === "open" && (
          <OpenChallengesTab
            duels={openDuels.data ?? []}
            isLoading={openDuels.isLoading}
            myPrincipal={myPrincipal}
          />
        )}
        {activeTab === "mine" && (
          <MyDuelsTab
            duels={myDuels.data ?? []}
            isLoading={myDuels.isLoading}
            myPrincipal={myPrincipal}
            onPlayDuel={onPlayDuel}
          />
        )}
        {activeTab === "history" && (
          <HistoryTab
            duels={history.data ?? []}
            isLoading={history.isLoading}
            myPrincipal={myPrincipal}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-10 text-center">
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
