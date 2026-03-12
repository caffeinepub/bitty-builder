import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import GameScreen from "./components/GameScreen";
import HomeScreen from "./components/HomeScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";

export type Screen = "home" | "game" | "leaderboard";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <div className="min-h-screen bg-background text-foreground noise-overlay">
      {screen === "home" && (
        <HomeScreen
          onPlay={() => setScreen("game")}
          onLeaderboard={() => setScreen("leaderboard")}
        />
      )}
      {screen === "game" && (
        <GameScreen
          onQuit={() => setScreen("home")}
          onLeaderboard={() => setScreen("leaderboard")}
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
