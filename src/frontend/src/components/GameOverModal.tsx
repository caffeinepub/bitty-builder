import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCheckNickname,
  useMyNickname,
  useRegisterNickname,
  useSubmitScore,
} from "../hooks/useQueries";

interface Props {
  score: number;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
  onQuit: () => void;
}

export default function GameOverModal({
  score,
  onPlayAgain,
  onLeaderboard,
  onQuit,
}: Props) {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { isFetching: actorFetching } = useActor();
  const isAuthenticated = !!identity;

  const { data: existingNickname, isLoading: nicknameLoading } =
    useMyNickname();
  const [nickname, setNickname] = useState("");
  const [scoreSaved, setScoreSaved] = useState(false);

  const { data: nicknameAvailable, isFetching: checkingNickname } =
    useCheckNickname(nickname.trim().length >= 2 ? nickname : "");

  const registerMutation = useRegisterNickname();
  const submitMutation = useSubmitScore();

  useEffect(() => {
    if (existingNickname) {
      setNickname(existingNickname);
    }
  }, [existingNickname]);

  const handleSaveScore = async () => {
    if (!existingNickname) {
      if (!nickname.trim() || nickname.trim().length < 2) {
        toast.error("Nickname must be at least 2 characters");
        return;
      }
      if (nicknameAvailable === false) {
        toast.error("Nickname already taken");
        return;
      }
      try {
        await registerMutation.mutateAsync(nickname.trim());
        await submitMutation.mutateAsync(score);
        setScoreSaved(true);
        toast.success("Score saved!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save score");
      }
    } else {
      try {
        await submitMutation.mutateAsync(score);
        setScoreSaved(true);
        toast.success("Score saved!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save score");
      }
    }
  };

  const isSaving = registerMutation.isPending || submitMutation.isPending;

  const getNicknameStatus = () => {
    if (nickname.trim().length < 2) return null;
    if (checkingNickname) return "checking";
    if (nicknameAvailable === true) return "available";
    if (nicknameAvailable === false) return "taken";
    return null;
  };

  const nickStatus = getNicknameStatus();

  const handleShareOnX = () => {
    const text = `I just scored ${score.toLocaleString()} on Bitty Builder! Can you beat me? @bittyicp #BittyBuilder #ICP GAMES @ BITTYONICP.COM`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <motion.div
        key="gameover-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
      >
        <motion.div
          key="gameover-panel"
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-sm rounded-sm p-6 flex flex-col gap-4"
          data-ocid="score.modal"
          style={{
            background: "#0d0d1a",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
            boxShadow:
              "0 0 40px rgba(255,0,170,0.3), 0 0 80px rgba(170,255,0,0.1)",
            outline: "2px solid rgba(255,0,170,0.4)",
          }}
        >
          {/* Game Over title */}
          <div className="text-center">
            <h2
              className="font-display font-black text-3xl"
              style={{
                background: "linear-gradient(135deg, #FF00AA, #FF6B00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              GAME OVER
            </h2>
            <div className="mt-2">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Final Score
              </span>
              <div
                className="font-mono font-bold text-4xl leading-none mt-1"
                style={{ color: "#AAFF00" }}
              >
                {score.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Save score section */}
          {!scoreSaved && (
            <div className="flex flex-col gap-3">
              {!isAuthenticated ? (
                <div className="text-center flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground font-mono">
                    Sign in to save your score to the leaderboard!
                  </p>
                  <Button
                    type="button"
                    onClick={login}
                    disabled={isLoggingIn}
                    data-ocid="auth.login_button"
                    className="w-full font-display font-black"
                    style={{
                      background: "linear-gradient(135deg, #AAFF00, #00DDFF)",
                      color: "#06060f",
                    }}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In with Internet Identity"
                    )}
                  </Button>
                </div>
              ) : nicknameLoading || actorFetching ? (
                <div
                  className="flex justify-center"
                  data-ocid="score.loading_state"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !existingNickname ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-mono text-muted-foreground">
                    Choose a nickname to claim your spot on the leaderboard:
                  </p>
                  <div className="relative">
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="YourNickname"
                      maxLength={20}
                      data-ocid="nickname.input"
                      className="font-mono bg-transparent border-border/50 focus:border-[#AAFF00]/50"
                    />
                    {nickStatus && (
                      <span
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono"
                        style={{
                          color:
                            nickStatus === "available"
                              ? "#AAFF00"
                              : nickStatus === "taken"
                                ? "#FF00AA"
                                : "#888",
                        }}
                      >
                        {nickStatus === "checking"
                          ? "..."
                          : nickStatus === "available"
                            ? "✓"
                            : "✗"}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleSaveScore}
                    disabled={
                      isSaving ||
                      nickStatus === "taken" ||
                      !nickname.trim() ||
                      actorFetching
                    }
                    data-ocid="nickname.submit_button"
                    className="w-full font-display font-black"
                    style={{
                      background:
                        isSaving ||
                        nickStatus === "taken" ||
                        !nickname.trim() ||
                        actorFetching
                          ? undefined
                          : "linear-gradient(135deg, #AAFF00, #00DDFF)",
                      color: "#06060f",
                    }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Claim Nickname & Save Score"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-mono text-muted-foreground">
                    Save score as{" "}
                    <span style={{ color: "#AAFF00" }}>
                      @{existingNickname}
                    </span>
                    ?
                  </p>
                  <Button
                    type="button"
                    onClick={handleSaveScore}
                    disabled={isSaving || actorFetching}
                    data-ocid="score.save_button"
                    className="w-full font-display font-black"
                    style={{
                      background:
                        isSaving || actorFetching
                          ? undefined
                          : "linear-gradient(135deg, #AAFF00, #00DDFF)",
                      color: "#06060f",
                    }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      `Save Score as @${existingNickname}`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Score saved confirmation */}
          {scoreSaved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-2"
              data-ocid="score.success_state"
            >
              <p className="font-mono font-bold" style={{ color: "#AAFF00" }}>
                ✓ Score saved to leaderboard!
              </p>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              type="button"
              onClick={onPlayAgain}
              data-ocid="game.primary_button"
              className="btn-arcade w-full py-3 font-display font-black text-sm rounded-sm"
              style={{
                background: "linear-gradient(135deg, #00DDFF, #8B00FF)",
                color: "#fff",
              }}
            >
              ▶ PLAY AGAIN
            </button>

            {/* Share on X */}
            <button
              type="button"
              onClick={handleShareOnX}
              data-ocid="score.share_button"
              className="btn-arcade w-full py-2 font-display font-black text-sm rounded-sm"
              style={{
                background: "#000",
                border: "2px solid #fff",
                color: "#fff",
              }}
            >
              𝕏 Share Score
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onLeaderboard}
                className="btn-arcade flex-1 py-2 font-display font-black text-xs rounded-sm"
                style={{
                  border: "2px solid #FF00AA",
                  color: "#FF00AA",
                  background: "transparent",
                }}
              >
                🏆 SCORES
              </button>
              <button
                type="button"
                onClick={onQuit}
                className="btn-arcade flex-1 py-2 font-display font-black text-xs rounded-sm"
                style={{
                  border: "2px solid rgba(255,255,255,0.15)",
                  color: "#666",
                  background: "transparent",
                }}
              >
                ✕ MENU
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
