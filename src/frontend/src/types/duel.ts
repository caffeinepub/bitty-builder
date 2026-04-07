import type { Principal } from "@icp-sdk/core/principal";

export interface LeaderboardEntry {
  rank: bigint;
  nickname: string;
  score: bigint;
  timestamp: bigint;
  shareCount?: bigint;
  principal: Principal;
}

export interface ScoreRecord {
  score: bigint;
  timestamp: bigint;
}

export interface ChatMessage {
  id: string;
  sender: Principal;
  nickname: string;
  text: string;
  timestamp: bigint;
}

export type DuelState =
  | { open: null }
  | { matched: null }
  | { challenger_played: null }
  | { opponent_played: null }
  | { resolved: null }
  | { expired: null };

export interface DuelChallenge {
  id: string;
  challenger: Principal;
  challengerNickname: string;
  opponent: [] | [Principal];
  opponentNickname: [] | [string];
  amount: bigint;
  state: DuelState;
  challengerScore: [] | [bigint];
  opponentScore: [] | [bigint];
  winnerId: [] | [Principal];
  createdAt: bigint;
  matchedAt: [] | [bigint];
  expiresAt: bigint;
}

export type TransferResult = { ok: string } | { err: string };

/** Extended actor interface with all duel methods */
export interface DuelActor {
  postDuelChallenge(amount: bigint): Promise<TransferResult>;
  acceptDuelChallenge(duelId: string): Promise<TransferResult>;
  playDuel(duelId: string, score: bigint): Promise<TransferResult>;
  getOpenDuels(): Promise<DuelChallenge[]>;
  getMyDuels(): Promise<DuelChallenge[]>;
  getDuelHistory(): Promise<DuelChallenge[]>;
  expireOldDuels(): Promise<void>;
}

export function getDuelStateName(state: DuelState): string {
  if ("open" in state) return "open";
  if ("matched" in state) return "matched";
  if ("challenger_played" in state) return "challenger_played";
  if ("opponent_played" in state) return "opponent_played";
  if ("resolved" in state) return "resolved";
  if ("expired" in state) return "expired";
  return "unknown";
}
