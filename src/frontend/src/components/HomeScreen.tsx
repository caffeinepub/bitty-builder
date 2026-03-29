import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, VolumeX } from "lucide-react";
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
import ChatPopup from "./ChatPopup";
import WalletModal from "./WalletModal";

interface Props {
  onPlay: () => void;
  onLeaderboard: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

function TournamentBanner() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{`
        @keyframes flyPlane {
          0%   { transform: translateX(-320px); }
          100% { transform: translateX(calc(100vw + 40px)); }
        }
        @keyframes flickerColors {
          0%   { color: #00DDFF; text-shadow: 0 0 8px #00DDFF, 0 0 20px #00DDFF; }
          20%  { color: #FF00AA; text-shadow: 0 0 8px #FF00AA, 0 0 20px #FF00AA; }
          40%  { color: #AAFF00; text-shadow: 0 0 8px #AAFF00, 0 0 20px #AAFF00; }
          60%  { color: #FFD700; text-shadow: 0 0 8px #FFD700, 0 0 20px #FFD700; }
          80%  { color: #CC55FF; text-shadow: 0 0 8px #CC55FF, 0 0 20px #CC55FF; }
          100% { color: #00DDFF; text-shadow: 0 0 8px #00DDFF, 0 0 20px #00DDFF; }
        }
        .plane-fly {
          animation: flyPlane 11s linear infinite;
          position: absolute;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        .banner-flicker {
          animation: flickerColors 1.4s linear infinite;
          font-family: 'Courier New', monospace;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 0.07em;
          white-space: nowrap;
        }
      `}</style>

      {/* Sky strip that holds the plane */}
      <div
        data-ocid="tournament.banner"
        className="w-full relative overflow-hidden"
        style={{ height: 64 }}
      >
        <button
          type="button"
          className="plane-fly"
          onClick={() => setShowModal(true)}
          aria-label="View tournament details"
          style={{ background: "transparent", border: "none", padding: 0 }}
        >
          {/* Pixel plane body */}
          <div
            style={{
              fontSize: 34,
              lineHeight: 1,
              filter:
                "drop-shadow(0 0 8px #00DDFF) drop-shadow(0 0 14px #FF00AA)",
              userSelect: "none",
            }}
          >
            ✈️
          </div>

          {/* Tow rope */}
          <div
            style={{
              width: 24,
              height: 2,
              background: "linear-gradient(90deg, #FFD700, #FF00AA)",
              borderRadius: 2,
              boxShadow: "0 0 6px #FFD700",
              flexShrink: 0,
            }}
          />

          {/* Banner sign */}
          <div
            style={{
              padding: "5px 12px",
              background: "rgba(4,4,18,0.92)",
              border: "2px solid #00DDFF",
              borderRadius: 4,
              boxShadow:
                "0 0 16px rgba(0,221,255,0.5), 0 0 32px rgba(255,0,170,0.25), inset 0 0 20px rgba(0,0,0,0.5)",
            }}
          >
            <span className="banner-flicker">
              🏆 TOURNAMENT LIVE! (CLICK FOR DETAILS) 🏆
            </span>
          </div>
        </button>
      </div>

      {/* Tournament Details Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.90)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#06060f",
              border: "2px solid #00DDFF",
              borderRadius: 10,
              padding: "24px 20px",
              maxWidth: 380,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow:
                "0 0 40px rgba(0,221,255,0.35), 0 0 80px rgba(255,0,170,0.2)",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  fontFamily: "Courier New, monospace",
                  background:
                    "linear-gradient(90deg,#00DDFF,#FF00AA,#AAFF00,#FFD700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                🏆 GAME TOURNAMENT 🏆
              </div>
            </div>

            {/* Dates */}
            {[
              { label: "START", value: "Mar 28 — 9:00 PM UTC" },
              { label: "END", value: "Apr 3  — 9:00 PM UTC" },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    color: "#AAFF00",
                    fontWeight: 900,
                    fontFamily: "Courier New, monospace",
                    fontSize: 12,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    color: "#fff",
                    fontFamily: "Courier New, monospace",
                    fontSize: 12,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.12)",
                margin: "14px 0",
              }}
            />

            {/* Rules */}
            <div
              style={{
                color: "#00DDFF",
                fontWeight: 900,
                fontFamily: "Courier New, monospace",
                fontSize: 12,
                marginBottom: 8,
                letterSpacing: "0.08em",
              }}
            >
              RULES
            </div>
            {[
              'Play "BITTY BUILDER" and place high scores',
              "TOP 10 Weekly scores win",
              "Screenshot taken before leaderboard resets",
            ].map((r) => (
              <div
                key={r}
                style={{
                  color: "#ccc",
                  fontFamily: "Courier New, monospace",
                  fontSize: 11,
                  marginBottom: 5,
                }}
              >
                • {r}
              </div>
            ))}

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.12)",
                margin: "14px 0",
              }}
            />

            {/* Winnings */}
            <div
              style={{
                color: "#FFD700",
                fontWeight: 900,
                fontFamily: "Courier New, monospace",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 12,
                letterSpacing: "0.06em",
              }}
            >
              🏆 WINNINGS 🏆
            </div>
            {[
              {
                place: "1st",
                prize: "20 $ICP + 1M $BITTYICP",
                color: "#FFD700",
              },
              {
                place: "2nd",
                prize: "15 $ICP + 1M $BITTYICP",
                color: "#C0C0C0",
              },
              {
                place: "3rd",
                prize: "10 $ICP + 1M $BITTYICP",
                color: "#CD7F32",
              },
              {
                place: "4th",
                prize: "5 $ICP + 1M $BITTYICP",
                color: "#AAFF00",
              },
              { place: "5th", prize: "1M $BITTYICP", color: "#00DDFF" },
              { place: "6–10th", prize: "500k $BITTYICP", color: "#FF00AA" },
            ].map(({ place, prize, color }) => (
              <div
                key={place}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 7,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color,
                    fontWeight: 900,
                    fontFamily: "Courier New, monospace",
                    fontSize: 13,
                    minWidth: 54,
                  }}
                >
                  {place}
                </span>
                <span
                  style={{
                    color: "#fff",
                    fontFamily: "Courier New, monospace",
                    fontSize: 11,
                    textAlign: "right",
                  }}
                >
                  {prize}
                </span>
              </div>
            ))}

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.12)",
                margin: "14px 0",
              }}
            />

            {/* Bonus */}
            <div
              style={{
                textAlign: "center",
                color: "#FF00AA",
                fontWeight: 900,
                fontFamily: "Courier New, monospace",
                fontSize: 13,
                textShadow: "0 0 12px #FF00AA",
                letterSpacing: "0.04em",
              }}
            >
              🎁 BONUS REWARD!!! 2.5M $BITTYICP 🎁
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                marginTop: 22,
                width: "100%",
                padding: "11px 0",
                background: "transparent",
                border: "2px solid #FF00AA",
                borderRadius: 6,
                color: "#FF00AA",
                fontWeight: 900,
                fontFamily: "Courier New, monospace",
                fontSize: 13,
                cursor: "pointer",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </>
  );
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
  const [showChat, setShowChat] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

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

      {/* Tournament Plane Banner */}
      <div className="w-screen -mx-4 mt-3">
        <TournamentBanner />
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

          <button
            type="button"
            onClick={() => setShowChat(true)}
            data-ocid="chat.open_button"
            className="btn-arcade w-full py-3 text-base font-display font-black rounded-sm transition-all"
            style={{
              background: "transparent",
              border: "2px solid #00DDFF",
              color: "#00DDFF",
              boxShadow:
                "0 0 20px rgba(0,221,255,0.25), 0 4px 0 rgba(0,0,0,0.5)",
            }}
          >
            💬 PLAYER CHAT
          </button>

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setShowWallet(true)}
              data-ocid="wallet.open_modal_button"
              className="btn-arcade w-full py-3 text-base font-display font-black rounded-sm transition-all"
              style={{
                background: "transparent",
                border: "2px solid #AAFF00",
                color: "#AAFF00",
                boxShadow:
                  "0 0 20px rgba(170,255,0,0.25), 0 4px 0 rgba(0,0,0,0.5)",
              }}
            >
              💰 WALLET
            </button>
          )}

          {/* How to Play */}
          <div
            data-ocid="home.how_to_play.panel"
            className="w-full rounded-sm mt-1"
            style={{
              background: "rgba(0,0,0,0.55)",
              border: "2px solid rgba(170,0,255,0.45)",
              boxShadow:
                "0 0 18px rgba(170,0,255,0.2), inset 0 0 20px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="px-4 py-2 border-b"
              style={{ borderColor: "rgba(170,0,255,0.3)" }}
            >
              <span
                className="font-display font-black text-sm tracking-widest uppercase"
                style={{
                  background:
                    "linear-gradient(135deg, #AA00FF, #00DDFF, #AAFF00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 8px rgba(170,0,255,0.5))",
                }}
              >
                HOW TO PLAY
              </span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl">👈👉</span>
                <div className="flex-1">
                  <span
                    className="text-xs font-display font-black uppercase tracking-wide"
                    style={{
                      color: "#AAFF00",
                      textShadow: "0 0 8px rgba(170,255,0,0.5)",
                    }}
                  >
                    Swipe Left / Right
                  </span>
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Move piece
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl">👇</span>
                <div className="flex-1">
                  <span
                    className="text-xs font-display font-black uppercase tracking-wide"
                    style={{
                      color: "#00DDFF",
                      textShadow: "0 0 8px rgba(0,221,255,0.5)",
                    }}
                  >
                    Swipe Down
                  </span>
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Instant drop
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl">👆</span>
                <div className="flex-1">
                  <span
                    className="text-xs font-display font-black uppercase tracking-wide"
                    style={{
                      color: "#FF00AA",
                      textShadow: "0 0 8px rgba(255,0,170,0.5)",
                    }}
                  >
                    Tap
                  </span>
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Rotate piece
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl">🔒</span>
                <div className="flex-1">
                  <span
                    className="text-xs font-display font-black uppercase tracking-wide"
                    style={{
                      color: "#CC55FF",
                      textShadow: "0 0 8px rgba(170,0,255,0.5)",
                    }}
                  >
                    Hold Button
                  </span>
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Save piece
                </span>
              </div>
            </div>
          </div>
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
      <footer className="mt-auto pt-6 text-center">
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

      {/* Chat popup */}
      <AnimatePresence>
        {showChat && <ChatPopup onClose={() => setShowChat(false)} />}
        {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
      </AnimatePresence>
    </div>
  );
}
