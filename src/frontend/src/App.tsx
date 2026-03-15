import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import GameScreen from "./components/GameScreen";
import HomeScreen from "./components/HomeScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import { MusicEngine } from "./game/music";

export type Screen = "home" | "game" | "leaderboard";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const musicRef = useRef<MusicEngine | null>(null);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem("bitty_muted") === "true";
    } catch (_e) {
      return false;
    }
  });

  // Lazily initialize and get music engine
  const getMusic = useCallback((): MusicEngine => {
    if (!musicRef.current) {
      musicRef.current = new MusicEngine();
    }
    return musicRef.current;
  }, []);

  // Start music on first user interaction (autoplay policy)
  useEffect(() => {
    const handler = () => {
      getMusic().triggerStart();
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [getMusic]);

  // Queue music to start (will actually start on first user interaction)
  useEffect(() => {
    getMusic().play();
  }, [getMusic]);

  const handleToggleMute = useCallback(() => {
    const music = getMusic();
    const next = !isMuted;
    setIsMuted(next);
    music.setMuted(next);
  }, [isMuted, getMusic]);

  return (
    <div className="min-h-screen bg-background text-foreground noise-overlay">
      {screen === "home" && (
        <HomeScreen
          onPlay={() => setScreen("game")}
          onLeaderboard={() => setScreen("leaderboard")}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}
      {screen === "game" && (
        <GameScreen
          onQuit={() => setScreen("home")}
          onLeaderboard={() => setScreen("leaderboard")}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}
      {screen === "leaderboard" && (
        <LeaderboardScreen
          onPlay={() => setScreen("game")}
          onHome={() => setScreen("home")}
        />
      )}
      <Toaster />
    </div>
  );
}
