import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useChangeNickname,
  useCheckNickname,
  useMyBestScore,
  useMyNickname,
} from "../hooks/useQueries";

interface Props {
  onPlay: () => void;
  onLeaderboard: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function HomeScreen({
  onPlay,
  onLeaderboard,
  isMuted,
  onToggleMute,
}: Props) {
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const isAuthenticated = !!identity;
  const principal = identity?.getPrincipal();

  const { data: myNickname } = useMyNickname();
  const { data: myBest } = useMyBestScore(principal);
  const [showChangeName, setShowChangeName] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: nameAvailable, isFetching: checkingName } = useCheckNickname(
    newName.trim().length >= 2 ? newName : "",
  );
  const changeMutation = useChangeNickname();

  const handleChangeName = async () => {
    if (!newName.trim() || newName.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    if (nameAvailable === false) {
      toast.error("That name is already taken");
      return;
    }
    try {
      await changeMutation.mutateAsync(newName.trim());
      toast.success("Name updated!");
      setShowChangeName(false);
      setNewName("");
    } catch (_e) {
      toast.error("Failed to change name");
    }
  };

  const nameStatus = () => {
    if (newName.trim().length < 2) return null;
    if (checkingName) return "checking";
    if (nameAvailable === true) return "available";
    if (nameAvailable === false) return "taken";
    return null;
  };
  const ns = nameStatus();

  const hotPinkButtonStyle = {
    background: "#000",
    border: "2px solid #FF1493",
    color: "#FF1493",
    fontWeight: 700,
    boxShadow: "0 0 8px rgba(255,20,147,0.4)",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-4 py-6 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(170,255,0,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(255,0,170,0.07) 0%, transparent 50%), #06060f",
      }}
    >
      {/* Top bar: personal best left, controls right */}
      <div className="w-full flex justify-between items-center">
        {/* Personal best - top left */}
        {isAuthenticated && myBest != null ? (
          <div
            data-ocid="home.personal_best"
            className="flex flex-col items-center px-3 py-1.5 rounded-sm"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "2px solid rgba(170,255,0,0.5)",
              boxShadow: "0 0 12px rgba(170,255,0,0.3)",
            }}
          >
            <span
              className="text-[9px] font-mono font-black tracking-widest uppercase"
              style={{ color: "rgba(170,255,0,0.7)" }}
            >
              BEST
            </span>
            <span
              className="font-mono font-black text-sm leading-none"
              style={{
                color: "#AAFF00",
                textShadow: "0 0 8px rgba(170,255,0,0.7)",
              }}
            >
              {myBest.toLocaleString()}
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Right side: mute + auth */}
        <div className="flex items-center gap-2">
          {/* Music mute button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleMute}
            data-ocid="music.toggle"
            style={hotPinkButtonStyle}
            className="font-mono text-xs p-2"
            title={isMuted ? "Unmute music" : "Mute music"}
          >
            {isMuted ? <VolumeX size={16} /> : <Music size={16} />}
          </Button>

          {/* Auth button */}
          {isInitializing ? null : isAuthenticated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clear}
              data-ocid="auth.logout_button"
              style={hotPinkButtonStyle}
              className="font-mono text-xs"
            >
              Sign Out
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={login}
              disabled={isLoggingIn}
              data-ocid="auth.login_button"
              style={hotPinkButtonStyle}
              className="font-mono text-xs"
            >
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-8 flex-1 justify-center w-full max-w-sm">
        {/* Mascot */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(170,255,0,0.35) 0%, rgba(0,221,255,0.2) 50%, transparent 70%)",
              transform: "scale(1.3)",
            }}
          />
          <div
            className="relative z-10"
            style={{
              padding: "4px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #AAFF00, #00DDFF, #FF00AA, #AA00FF)",
            }}
          >
            <img
              src="/assets/uploads/IMG_5219-1.jpeg"
              alt="Bitty mascot"
              className="w-48 h-48 md:w-60 md:h-60 rounded-full object-cover block"
              style={{
                background: "#06060f",
              }}
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-center"
        >
          <h1
            className="font-display font-black text-5xl md:text-6xl leading-none tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, #AAFF00 0%, #00DDFF 50%, #FF00AA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
              filter: "drop-shadow(0 0 20px rgba(170,255,0,0.4))",
            }}
          >
            BITTY
          </h1>
          <h1
            className="font-display font-black text-5xl md:text-6xl leading-none tracking-tight"
            style={{
              background: "linear-gradient(135deg, #FF00AA 0%, #AAFF00 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 20px rgba(255,0,170,0.4))",
            }}
          >
            BUILDER
          </h1>
          <p className="font-mono text-xs text-muted-foreground mt-2 tracking-widest uppercase">
            Powered by ICP
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-col gap-3 w-full"
        >
          <button
            type="button"
            onClick={onPlay}
            data-ocid="game.play_button"
            className="btn-arcade w-full py-4 text-xl font-display font-black text-[#06060f] rounded-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #AAFF00, #00DDFF)",
              boxShadow:
                "0 0 30px rgba(170,255,0,0.5), 0 4px 0 rgba(0,0,0,0.5)",
            }}
          >
            ▶ PLAY
          </button>

          <button
            type="button"
            onClick={onLeaderboard}
            data-ocid="game.leaderboard_button"
            className="btn-arcade w-full py-3 text-base font-display font-black rounded-sm transition-all"
            style={{
              background: "transparent",
              border: "2px solid #FF00AA",
              color: "#FF00AA",
              boxShadow:
                "0 0 20px rgba(255,0,170,0.3), 0 4px 0 rgba(0,0,0,0.5)",
            }}
          >
            🏆 LEADERBOARD
          </button>
        </motion.div>

        {/* Auth / nickname status */}
        {!isAuthenticated && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground font-mono"
          >
            Sign in to save your high score!
          </motion.p>
        )}

        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full flex flex-col items-center gap-2"
          >
            {myNickname ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono"
                  style={{ color: "#AAFF00" }}
                >
                  ✓ Playing as @{myNickname}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewName(myNickname);
                    setShowChangeName(!showChangeName);
                  }}
                  data-ocid="nickname.edit_button"
                  className="text-xs font-mono underline"
                  style={{ color: "#00DDFF" }}
                >
                  Change name
                </button>
              </div>
            ) : (
              <p
                className="text-center text-xs font-mono"
                style={{ color: "#AAFF00" }}
              >
                ✓ Signed in — claim a nickname when you submit a score!
              </p>
            )}

            <AnimatePresence>
              {showChangeName && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                >
                  <div
                    className="flex flex-col gap-2 p-3 rounded-sm mt-1"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(0,221,255,0.3)",
                    }}
                  >
                    <p className="text-xs font-mono text-muted-foreground">
                      Your score will carry over to the new name.
                    </p>
                    <div className="relative">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="New nickname"
                        maxLength={20}
                        data-ocid="nickname.input"
                        className="font-mono bg-transparent border-border/50 focus:border-[#00DDFF]/50"
                      />
                      {ns && (
                        <span
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono"
                          style={{
                            color:
                              ns === "available"
                                ? "#AAFF00"
                                : ns === "taken"
                                  ? "#FF00AA"
                                  : "#888",
                          }}
                        >
                          {ns === "checking"
                            ? "..."
                            : ns === "available"
                              ? "✓"
                              : "✗"}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleChangeName}
                        disabled={
                          changeMutation.isPending ||
                          ns === "taken" ||
                          !newName.trim()
                        }
                        data-ocid="nickname.save_button"
                        className="flex-1 py-2 text-xs font-display font-black rounded-sm"
                        style={{
                          background:
                            changeMutation.isPending ||
                            ns === "taken" ||
                            !newName.trim()
                              ? "rgba(255,255,255,0.1)"
                              : "linear-gradient(135deg, #00DDFF, #AAFF00)",
                          color: "#06060f",
                        }}
                      >
                        {changeMutation.isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangeName(false);
                          setNewName("");
                        }}
                        data-ocid="nickname.cancel_button"
                        className="flex-1 py-2 text-xs font-mono rounded-sm"
                        style={{
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "#666",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground font-mono">
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Built with ♥ using caffeine.ai
        </a>
      </footer>
    </div>
  );
}
