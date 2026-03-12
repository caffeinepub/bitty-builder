import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SoundEngine } from "../game/sounds";
import { type GameState, TetrisGame } from "../game/tetris";
import type { SoundEvent } from "../game/tetris";
import GameOverModal from "./GameOverModal";

interface Props {
  onQuit: () => void;
  onLeaderboard: () => void;
}

const CELL_SIZE_DESKTOP = 28;
const CELL_SIZE_MOBILE = 26;

function isMobile() {
  return window.innerWidth < 640;
}

export default function GameScreen({ onQuit, onLeaderboard }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<TetrisGame | null>(null);
  const soundRef = useRef<SoundEngine>(new SoundEngine());
  const mascotImgRef = useRef<HTMLImageElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 0,
    lines: 0,
    status: "idle",
    nextPiece: "I",
    holdPiece: null,
    canHold: true,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const cellSize = isMobile() ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;

  // Load mascot image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      mascotImgRef.current = img;
      if (gameRef.current) {
        gameRef.current.setMascotImg(img);
      }
    };
    img.src = "/assets/uploads/IMG_5219-1.jpeg";
  }, []);

  // Init game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new TetrisGame({
      onStateChange: (state) => {
        setGameState(state);
        if (state.status === "gameover") {
          setFinalScore(state.score);
          setTimeout(() => setShowGameOver(true), 700);
        }
      },
      onSound: (event: SoundEvent) => {
        soundRef.current.play(event);
      },
    });

    game.setCanvas(
      canvas,
      cellSize,
      mascotImgRef.current,
      nextCanvasRef.current,
      holdCanvasRef.current,
    );

    gameRef.current = game;
    game.start();

    return () => {
      game.destroy();
    };
  }, [cellSize]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const game = gameRef.current;
      if (!game) return;
      const state = game.getPublicState();
      if (state.status === "gameover") return;
      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault();
          game.moveLeft();
          break;
        case "ArrowRight":
          e.preventDefault();
          game.moveRight();
          break;
        case "ArrowDown":
          e.preventDefault();
          game.softDrop();
          break;
        case "ArrowUp":
        case "KeyZ":
          e.preventDefault();
          game.rotateCW();
          break;
        case "KeyX":
          game.rotateCCW();
          break;
        case "Space":
          e.preventDefault();
          game.hardDrop();
          break;
        case "KeyC":
          game.hold();
          break;
        case "Escape":
        case "KeyP":
          if (state.status === "playing") game.pause();
          else if (state.status === "paused") game.resume();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Toggle sound
  useEffect(() => {
    soundRef.current.enabled = soundEnabled;
  }, [soundEnabled]);

  const handlePauseResume = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const state = game.getPublicState();
    if (state.status === "playing") game.pause();
    else if (state.status === "paused") game.resume();
  }, []);

  const handleQuit = useCallback(() => {
    gameRef.current?.destroy();
    onQuit();
  }, [onQuit]);

  const handlePlayAgain = useCallback(() => {
    setShowGameOver(false);
    setFinalScore(0);
    const game = gameRef.current;
    if (game) {
      game.start();
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const dt = Date.now() - start.time;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const game = gameRef.current;
    if (!game) return;

    if (absDx < 12 && absDy < 12) {
      game.rotateCW();
    } else if (absDx > absDy && absDx > 25) {
      if (dx > 0) game.moveRight();
      else game.moveLeft();
    } else if (absDy > absDx && absDy > 25) {
      if (dy > 0) {
        if (dt < 200 && absDy > 60) {
          game.hardDrop();
        } else {
          game.softDrop();
        }
      }
    }
    touchStartRef.current = null;
  }, []);

  const canvasW = 10 * cellSize;
  const canvasH = 20 * cellSize;
  const previewSize = cellSize * 4;

  return (
    <div
      className="min-h-screen flex flex-col items-center select-none"
      style={{
        touchAction: "none",
        background:
          "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(170,255,0,0.12) 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 100% 100%, rgba(255,0,170,0.1) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 0% 60%, rgba(0,221,255,0.08) 0%, transparent 50%), #06060f",
      }}
    >
      {/* Top HUD */}
      <div
        className="w-full max-w-sm px-3 pt-3 pb-3 flex items-center justify-between gap-2"
        style={{
          borderBottom: "2px solid rgba(170,255,0,0.2)",
          background: "rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-xs font-mono font-bold text-[#AAFF00]/70 uppercase tracking-widest">
              Score
            </div>
            <div
              className="font-mono font-black text-2xl leading-none"
              style={{
                color: "#AAFF00",
                textShadow: "0 0 12px rgba(170,255,0,0.7)",
              }}
            >
              {gameState.score.toLocaleString()}
            </div>
          </div>
          <div
            className="w-px"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
          <div className="text-center">
            <div className="text-xs font-mono font-bold text-[#00DDFF]/70 uppercase tracking-widest">
              Level
            </div>
            <div
              className="font-mono font-black text-2xl leading-none"
              style={{
                color: "#00DDFF",
                textShadow: "0 0 12px rgba(0,221,255,0.7)",
              }}
            >
              {gameState.level + 1}
            </div>
          </div>
          <div
            className="w-px"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
          <div className="text-center">
            <div className="text-xs font-mono font-bold text-[#FF00AA]/70 uppercase tracking-widest">
              Lines
            </div>
            <div
              className="font-mono font-black text-2xl leading-none"
              style={{
                color: "#FF00AA",
                textShadow: "0 0 12px rgba(255,0,170,0.7)",
              }}
            >
              {gameState.lines}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className="p-2 rounded transition-colors"
            style={{ color: soundEnabled ? "#AAFF00" : "#555" }}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            type="button"
            onClick={handlePauseResume}
            data-ocid="game.pause_button"
            className="p-2 rounded transition-colors"
            style={{
              color: gameState.status === "paused" ? "#AAFF00" : "#00DDFF",
              textShadow: "0 0 8px currentColor",
            }}
          >
            {gameState.status === "paused" ? (
              <Play size={22} />
            ) : (
              <Pause size={22} />
            )}
          </button>
        </div>
      </div>

      {/* Game area */}
      <div className="flex items-start gap-2 px-2 pt-3">
        {/* Hold panel */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <span
            className="text-xs font-mono font-black uppercase tracking-widest"
            style={{
              color: "#AA00FF",
              textShadow: "0 0 8px rgba(170,0,255,0.6)",
            }}
          >
            Hold
          </span>
          <div
            className="rounded-sm overflow-hidden"
            style={{
              border: "2px solid rgba(170,0,255,0.5)",
              boxShadow: "0 0 10px rgba(170,0,255,0.3)",
              opacity: gameState.canHold ? 1 : 0.4,
            }}
          >
            <canvas
              ref={holdCanvasRef}
              width={previewSize}
              height={previewSize}
            />
          </div>
        </div>

        {/* Main canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            data-ocid="game.canvas_target"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="block rounded-sm"
            style={{
              border: "3px solid #AAFF00",
              boxShadow:
                "0 0 25px rgba(170,255,0,0.5), 0 0 50px rgba(170,255,0,0.2), inset 0 0 30px rgba(0,0,0,0.5)",
            }}
          />

          {/* Pause overlay buttons */}
          {gameState.status === "paused" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: "rgba(6,6,15,0.85)" }}
            >
              <p
                className="font-display font-black text-3xl"
                style={{
                  color: "#AAFF00",
                  textShadow: "0 0 20px rgba(170,255,0,0.8)",
                }}
              >
                PAUSED
              </p>
              <button
                type="button"
                onClick={handlePauseResume}
                data-ocid="game.resume_button"
                className="btn-arcade px-8 py-3 text-base font-display font-black rounded-sm"
                style={{
                  background: "linear-gradient(135deg, #AAFF00, #00DDFF)",
                  color: "#06060f",
                  boxShadow: "0 0 20px rgba(170,255,0,0.5)",
                }}
              >
                ▶ RESUME
              </button>
              <button
                type="button"
                onClick={handleQuit}
                data-ocid="game.quit_button"
                className="btn-arcade px-8 py-3 text-base font-display font-black rounded-sm"
                style={{
                  background: "transparent",
                  border: "2px solid #FF00AA",
                  color: "#FF00AA",
                  boxShadow: "0 0 15px rgba(255,0,170,0.4)",
                }}
              >
                ✕ QUIT
              </button>
            </div>
          )}
        </div>

        {/* Next panel */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <span
            className="text-xs font-mono font-black uppercase tracking-widest"
            style={{
              color: "#00DDFF",
              textShadow: "0 0 8px rgba(0,221,255,0.6)",
            }}
          >
            Next
          </span>
          <div
            className="rounded-sm overflow-hidden"
            style={{
              border: "2px solid rgba(0,221,255,0.5)",
              boxShadow: "0 0 10px rgba(0,221,255,0.3)",
            }}
          >
            <canvas
              ref={nextCanvasRef}
              width={previewSize}
              height={previewSize}
            />
          </div>
        </div>
      </div>

      {/* Touch controls */}
      <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-xs px-3">
        {/* Row 1: Hold | Rotate | Hard Drop */}
        <div className="flex gap-2 w-full justify-center">
          <TouchBtn
            onPress={() => gameRef.current?.hold()}
            className="flex-1"
            label="HOLD"
            bgColor="rgba(170,0,255,0.25)"
            borderColor="#AA00FF"
            textColor="#CC55FF"
            glowColor="rgba(170,0,255,0.4)"
          >
            <span className="text-sm font-mono font-black">HOLD</span>
          </TouchBtn>
          <TouchBtn
            onPress={() => gameRef.current?.rotateCW()}
            className="flex-1"
            label="Rotate"
            bgColor="rgba(170,255,0,0.2)"
            borderColor="#AAFF00"
            textColor="#AAFF00"
            glowColor="rgba(170,255,0,0.5)"
          >
            <RotateCcw size={24} />
          </TouchBtn>
          <TouchBtn
            onPress={() => gameRef.current?.hardDrop()}
            className="flex-1"
            label="Drop"
            bgColor="rgba(255,0,170,0.2)"
            borderColor="#FF00AA"
            textColor="#FF00AA"
            glowColor="rgba(255,0,170,0.5)"
          >
            <ChevronsDown size={24} />
          </TouchBtn>
        </div>
        {/* Row 2: Left | Down | Right */}
        <div className="flex gap-2 w-full">
          <TouchBtn
            onPress={() => gameRef.current?.moveLeft()}
            className="flex-1"
            label="Left"
            bgColor="rgba(0,221,255,0.2)"
            borderColor="#00DDFF"
            textColor="#00DDFF"
            glowColor="rgba(0,221,255,0.5)"
          >
            <ChevronLeft size={28} strokeWidth={3} />
          </TouchBtn>
          <TouchBtn
            onPress={() => gameRef.current?.softDrop()}
            className="flex-1"
            label="Soft Drop"
            bgColor="rgba(0,221,255,0.15)"
            borderColor="#00DDFF"
            textColor="#00DDFF"
            glowColor="rgba(0,221,255,0.4)"
          >
            <ChevronDown size={28} strokeWidth={3} />
          </TouchBtn>
          <TouchBtn
            onPress={() => gameRef.current?.moveRight()}
            className="flex-1"
            label="Right"
            bgColor="rgba(0,221,255,0.2)"
            borderColor="#00DDFF"
            textColor="#00DDFF"
            glowColor="rgba(0,221,255,0.5)"
          >
            <ChevronRight size={28} strokeWidth={3} />
          </TouchBtn>
        </div>
      </div>

      {/* Game Over Modal */}
      {showGameOver && (
        <GameOverModal
          score={finalScore}
          onPlayAgain={handlePlayAgain}
          onLeaderboard={onLeaderboard}
          onQuit={handleQuit}
        />
      )}
    </div>
  );
}

interface TouchBtnProps {
  onPress: () => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  glowColor?: string;
}

function TouchBtn({
  onPress,
  children,
  className = "",
  bgColor = "rgba(255,255,255,0.1)",
  borderColor = "rgba(255,255,255,0.3)",
  textColor = "#fff",
  glowColor = "rgba(255,255,255,0.2)",
}: TouchBtnProps) {
  return (
    <button
      type="button"
      onTouchStart={(e) => {
        e.preventDefault();
        onPress();
      }}
      onClick={onPress}
      className={`flex items-center justify-center py-4 rounded-md border-2 bg-transparent active:scale-95 transition-transform ${className}`}
      style={{
        background: bgColor,
        borderColor: borderColor,
        color: textColor,
        boxShadow: `0 0 12px ${glowColor}, inset 0 0 8px ${glowColor}`,
      }}
    >
      {children}
    </button>
  );
}
