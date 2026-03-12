import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onPlay: () => void;
  onLeaderboard: () => void;
}

export default function HomeScreen({ onPlay, onLeaderboard }: Props) {
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const isAuthenticated = !!identity;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-4 py-6 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(170,255,0,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(255,0,170,0.07) 0%, transparent 50%), #06060f",
      }}
    >
      {/* Auth corner */}
      <div className="w-full flex justify-end">
        {isInitializing ? null : isAuthenticated ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clear}
            className="font-mono text-xs border-border/50 text-muted-foreground hover:text-foreground"
            data-ocid="auth.logout_button"
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
            className="font-mono text-xs border-[#AAFF00]/40 text-[#AAFF00] hover:bg-[#AAFF00]/10"
            data-ocid="auth.login_button"
          >
            {isLoggingIn ? "Signing in..." : "Sign In"}
          </Button>
        )}
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

        {/* Login nudge */}
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
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs font-mono"
            style={{ color: "#AAFF00" }}
          >
            ✓ Signed in — scores can be saved!
          </motion.p>
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
