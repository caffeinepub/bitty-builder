export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type CellValue = TetrominoType | null;
export type Board = CellValue[][];
export type GameStatus = "idle" | "playing" | "paused" | "gameover";

export interface GameState {
  score: number;
  level: number;
  lines: number;
  status: GameStatus;
  nextPiece: TetrominoType;
  holdPiece: TetrominoType | null;
  canHold: boolean;
}

export type SoundEvent =
  | "land"
  | "clear1"
  | "clear2"
  | "clear3"
  | "tetris"
  | "gameover"
  | "levelup";

// Each tetromino shape: array of [row, col] offsets (within 4x4 bounding box)
const SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  ],
  O: [
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
  ],
  T: [
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  S: [
    [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  Z: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  ],
  J: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
    ],
  ],
  L: [
    [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
};

export const PIECE_COLORS: Record<TetrominoType, string> = {
  I: "#00DDFF",
  O: "#FFE500",
  T: "#8B00FF",
  S: "#AAFF00",
  Z: "#FF00AA",
  J: "#4488FF",
  L: "#FF6B00",
};

// Drop interval (ms) per level
const DROP_INTERVALS = [800, 700, 600, 500, 400, 320, 240, 160, 110, 80, 60];

const ALL_TYPES: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];

function rand(): TetrominoType {
  return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
}

function createBoard(): Board {
  return Array.from({ length: 20 }, () => Array(10).fill(null) as CellValue[]);
}

interface Piece {
  type: TetrominoType;
  x: number; // col offset for bounding box
  y: number; // row offset for bounding box
  rotation: number; // 0-3
}

function getCells(piece: Piece): [number, number][] {
  return SHAPES[piece.type][piece.rotation].map(([r, c]) => [
    piece.y + r,
    piece.x + c,
  ]);
}

function isValid(piece: Piece, board: Board): boolean {
  for (const [r, c] of getCells(piece)) {
    if (r < 0 || r >= 20 || c < 0 || c >= 10) return false;
    if (r >= 0 && board[r][c] !== null) return false;
  }
  return true;
}

function spawnX(_type: TetrominoType): number {
  return 3;
}

export interface TetrisCallbacks {
  onStateChange: (state: GameState) => void;
  onSound: (event: SoundEvent) => void;
}

export class TetrisGame {
  private board: Board = createBoard();
  private current: Piece | null = null;
  private nextType: TetrominoType = rand();
  private holdType: TetrominoType | null = null;
  private canHoldFlag = true;
  private score = 0;
  private level = 0;
  private lines = 0;
  private status: GameStatus = "idle";

  private canvas: HTMLCanvasElement | null = null;
  private nextCanvas: HTMLCanvasElement | null = null;
  private holdCanvas: HTMLCanvasElement | null = null;
  private mascotImg: HTMLImageElement | null = null;
  private cellSize = 30;

  private rafId: number | null = null;
  private lastDropTime = 0;

  private callbacks: TetrisCallbacks;

  constructor(callbacks: TetrisCallbacks) {
    this.callbacks = callbacks;
  }

  setCanvas(
    canvas: HTMLCanvasElement,
    cellSize: number,
    mascotImg: HTMLImageElement | null,
    nextCanvas?: HTMLCanvasElement | null,
    holdCanvas?: HTMLCanvasElement | null,
  ) {
    this.canvas = canvas;
    this.cellSize = cellSize;
    this.mascotImg = mascotImg;
    this.nextCanvas = nextCanvas || null;
    this.holdCanvas = holdCanvas || null;
  }

  setMascotImg(img: HTMLImageElement) {
    this.mascotImg = img;
  }

  start() {
    this.board = createBoard();
    this.score = 0;
    this.level = 0;
    this.lines = 0;
    this.holdType = null;
    this.canHoldFlag = true;
    this.nextType = rand();
    this.status = "playing";
    this.spawnPiece();
    if ((this.status as GameStatus) === "gameover") return;
    this.lastDropTime = performance.now();
    this.scheduleTick();
    this.emitState();
  }

  pause() {
    if (this.status !== "playing") return;
    this.status = "paused";
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.emitState();
    this.render();
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.lastDropTime = performance.now();
    this.scheduleTick();
    this.emitState();
  }

  moveLeft() {
    if (!this.current || this.status !== "playing") return;
    const moved = { ...this.current, x: this.current.x - 1 };
    if (isValid(moved, this.board)) {
      this.current = moved;
      this.render();
    }
  }

  moveRight() {
    if (!this.current || this.status !== "playing") return;
    const moved = { ...this.current, x: this.current.x + 1 };
    if (isValid(moved, this.board)) {
      this.current = moved;
      this.render();
    }
  }

  softDrop() {
    if (!this.current || this.status !== "playing") return;
    const moved = { ...this.current, y: this.current.y + 1 };
    if (isValid(moved, this.board)) {
      this.current = moved;
      this.score += 1;
      this.lastDropTime = performance.now();
      this.render();
      this.emitState();
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    if (!this.current || this.status !== "playing") return;
    let dropped = 0;
    while (this.current) {
      const cur = this.current;
      const moved = { ...cur, y: cur.y + 1 };
      if (isValid(moved, this.board)) {
        this.current = moved;
        dropped++;
      } else {
        break;
      }
    }
    this.score += dropped * 2;
    this.lockPiece();
  }

  rotateCW() {
    this.tryRotate(1);
  }

  rotateCCW() {
    this.tryRotate(-1);
  }

  private tryRotate(dir: 1 | -1) {
    if (!this.current || this.status !== "playing") return;
    const newRot = ((this.current.rotation + dir + 4) % 4) as 0 | 1 | 2 | 3;
    const rotated = { ...this.current, rotation: newRot };
    // Try offsets for wall kicks
    const xOffsets = [0, -1, 1, -2, 2];
    const yOffsets = [0, -1, 1];
    for (const dy of yOffsets) {
      for (const dx of xOffsets) {
        const candidate = { ...rotated, x: rotated.x + dx, y: rotated.y + dy };
        if (isValid(candidate, this.board)) {
          this.current = candidate;
          this.render();
          return;
        }
      }
    }
  }

  hold() {
    if (!this.current || !this.canHoldFlag || this.status !== "playing") return;
    const currentType = this.current.type;
    if (this.holdType === null) {
      this.holdType = currentType;
      this.spawnPiece();
    } else {
      const savedHold = this.holdType;
      this.holdType = currentType;
      this.current = {
        type: savedHold,
        x: spawnX(savedHold),
        y: 0,
        rotation: 0,
      };
      if (!isValid(this.current, this.board)) {
        this.current = null;
        this.status = "gameover";
        this.callbacks.onSound("gameover");
        this.emitState();
        return;
      }
    }
    this.canHoldFlag = false;
    this.render();
    this.renderPreviews();
    this.emitState();
  }

  private spawnPiece() {
    const type = this.nextType;
    this.nextType = rand();
    this.current = { type, x: spawnX(type), y: 0, rotation: 0 };
    if (!isValid(this.current, this.board)) {
      this.current = null;
      this.status = "gameover";
      this.callbacks.onSound("gameover");
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  private lockPiece() {
    if (!this.current) return;
    for (const [r, c] of getCells(this.current)) {
      if (r >= 0 && r < 20 && c >= 0 && c < 10) {
        this.board[r][c] = this.current.type;
      }
    }
    this.callbacks.onSound("land");
    const cleared = this.clearLines();
    const prevLevel = this.level;
    if (cleared > 0) {
      const pts = [0, 100, 300, 500, 800][cleared] ?? 800;
      this.score += pts * (this.level + 1);
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10);
      if (cleared === 4) {
        this.callbacks.onSound("tetris");
      } else {
        const evt: SoundEvent =
          (["clear1", "clear2", "clear3"] as SoundEvent[])[cleared - 1] ??
          "clear1";
        this.callbacks.onSound(evt);
      }
      if (this.level > prevLevel) {
        this.callbacks.onSound("levelup");
      }
    }
    this.canHoldFlag = true;
    this.current = null;
    if (this.status === "playing") {
      this.spawnPiece();
    }
    this.emitState();
    this.render();
    this.renderPreviews();
  }

  private clearLines(): number {
    let cleared = 0;
    for (let r = 19; r >= 0; r--) {
      if ((this.board[r] as CellValue[]).every((cell) => cell !== null)) {
        this.board.splice(r, 1);
        this.board.unshift(Array(10).fill(null) as CellValue[]);
        cleared++;
        r++;
      }
    }
    return cleared;
  }

  private scheduleTick() {
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(timestamp: number) {
    if (this.status !== "playing") return;
    const interval =
      DROP_INTERVALS[Math.min(this.level, DROP_INTERVALS.length - 1)];
    if (timestamp - this.lastDropTime >= interval) {
      this.lastDropTime = timestamp;
      if (this.current) {
        const moved = { ...this.current, y: this.current.y + 1 };
        if (isValid(moved, this.board)) {
          this.current = moved;
        } else {
          this.lockPiece();
          if (this.status !== "playing") return;
        }
      }
    }
    this.render();
    this.scheduleTick();
  }

  private getGhostY(): number {
    if (!this.current) return 0;
    let ghostY = this.current.y;
    while (true) {
      const test = { ...this.current, y: ghostY + 1 };
      if (isValid(test, this.board)) {
        ghostY++;
      } else {
        break;
      }
    }
    return ghostY;
  }

  render() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    const cs = this.cellSize;
    const W = 10 * cs;
    const H = 20 * cs;

    // Background
    ctx.fillStyle = "#06060f";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= 20; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cs);
      ctx.lineTo(W, r * cs);
      ctx.stroke();
    }
    for (let c = 0; c <= 10; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cs, 0);
      ctx.lineTo(c * cs, H);
      ctx.stroke();
    }

    // Board cells
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = this.board[r][c];
        if (cell !== null) {
          this.drawCell(ctx, c, r, cell, 1.0);
        }
      }
    }

    // Ghost piece
    if (this.current && this.status === "playing") {
      const ghostY = this.getGhostY();
      if (ghostY !== this.current.y) {
        const ghost = { ...this.current, y: ghostY };
        const ghostColor = PIECE_COLORS[this.current.type];
        for (const [r, c] of getCells(ghost)) {
          if (r >= 0) {
            ctx.strokeStyle = ghostColor;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(c * cs + 1.5, r * cs + 1.5, cs - 3, cs - 3);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    // Current piece
    if (this.current) {
      for (const [r, c] of getCells(this.current)) {
        if (r >= 0) {
          this.drawCell(ctx, c, r, this.current.type, 1.0);
        }
      }
    }

    // Pause overlay
    if (this.status === "paused") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    type: TetrominoType,
    alpha: number,
  ) {
    const cs = this.cellSize;
    const x = col * cs;
    const y = row * cs;
    const pad = 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Draw mascot image as texture
    if (this.mascotImg) {
      ctx.drawImage(
        this.mascotImg,
        x + pad,
        y + pad,
        cs - pad * 2,
        cs - pad * 2,
      );
    } else {
      ctx.fillStyle = "#222";
      ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);
    }

    // Color tint overlay
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = PIECE_COLORS[type];
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);

    // Top highlight
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + pad, y + pad, cs - pad * 2, 3);

    // Left highlight
    ctx.fillRect(x + pad, y + pad, 3, cs - pad * 2);

    // Bottom shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(x + pad, y + cs - pad - 3, cs - pad * 2, 3);

    ctx.restore();
  }

  renderPreviews() {
    if (this.nextCanvas) {
      this.renderPreviewCanvas(this.nextCanvas, this.nextType);
    }
    if (this.holdCanvas) {
      this.renderPreviewCanvas(this.holdCanvas, this.holdType);
    }
  }

  renderPreviewCanvas(canvas: HTMLCanvasElement, type: TetrominoType | null) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = "#06060f";
    ctx.fillRect(0, 0, W, H);
    if (!type) return;
    const shape = SHAPES[type][0];
    const cs = Math.floor(Math.min(W, H) / 4.5);
    let minR = Number.POSITIVE_INFINITY;
    let maxR = Number.NEGATIVE_INFINITY;
    let minC = Number.POSITIVE_INFINITY;
    let maxC = Number.NEGATIVE_INFINITY;
    for (const [r, c] of shape) {
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    }
    const pieceW = (maxC - minC + 1) * cs;
    const pieceH = (maxR - minR + 1) * cs;
    const offsetX = (W - pieceW) / 2 - minC * cs;
    const offsetY = (H - pieceH) / 2 - minR * cs;
    for (const [r, c] of shape) {
      const px = offsetX + c * cs;
      const py = offsetY + r * cs;
      ctx.save();
      if (this.mascotImg) {
        ctx.drawImage(this.mascotImg, px + 1, py + 1, cs - 2, cs - 2);
      }
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = PIECE_COLORS[type];
      ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(px + 1, py + 1, cs - 2, 3);
      ctx.fillRect(px + 1, py + 1, 3, cs - 2);
      ctx.restore();
    }
  }

  getPublicState(): GameState {
    return {
      score: this.score,
      level: this.level,
      lines: this.lines,
      status: this.status,
      nextPiece: this.nextType,
      holdPiece: this.holdType,
      canHold: this.canHoldFlag,
    };
  }

  private emitState() {
    this.callbacks.onStateChange(this.getPublicState());
  }

  destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.status = "idle";
  }
}
