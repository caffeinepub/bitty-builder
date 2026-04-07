import { useActor as _useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { createActor } from "../backend";
import type {
  ChatMessage,
  DuelChallenge,
  LeaderboardEntry,
  ScoreRecord,
} from "../types/duel";

// Full backend actor interface with all methods
export interface FullBackendActor {
  getAllTimeLeaderboard(): Promise<LeaderboardEntry[]>;
  getWeeklyLeaderboard(): Promise<LeaderboardEntry[]>;
  submitScore(score: bigint): Promise<void>;
  getTopScoresForUser(principal: Principal): Promise<ScoreRecord[]>;
  registerNickname(nickname: string): Promise<void>;
  changeNickname(newNickname: string): Promise<void>;
  isNicknameAvailable(nickname: string): Promise<boolean>;
  getMyNickname(): Promise<string | null>;
  adminResetWeeklyLeaderboard(password: string): Promise<void>;
  adminSetWeeklyResetTime(password: string, tsNs: bigint): Promise<void>;
  adminInsertScore(
    password: string,
    nickname: string,
    score: bigint,
  ): Promise<void>;
  recordShare(): Promise<void>;
  getIcpBalance(principal: Principal): Promise<bigint>;
  getBittyBalance(principal: Principal): Promise<bigint>;
  sendIcp(
    to: Principal,
    amount: bigint,
  ): Promise<{ ok: string } | { err: string }>;
  sendBitty(
    to: Principal,
    amount: bigint,
  ): Promise<{ ok: string } | { err: string }>;
  getChatMessages(): Promise<ChatMessage[]>;
  sendChatMessage(text: string): Promise<void>;
  deleteChatMessage(id: string): Promise<void>;
  deleteOwnChatMessage(id: string): Promise<void>;
  adminDeleteChatMessage(password: string, id: string): Promise<void>;
  postDuelChallenge(amount: bigint): Promise<{ ok: string } | { err: string }>;
  acceptDuelChallenge(
    duelId: string,
  ): Promise<{ ok: string } | { err: string }>;
  playDuel(
    duelId: string,
    score: bigint,
  ): Promise<{ ok: string } | { err: string }>;
  getOpenDuels(): Promise<DuelChallenge[]>;
  getMyDuels(): Promise<DuelChallenge[]>;
  getDuelHistory(): Promise<DuelChallenge[]>;
  expireOldDuels(): Promise<void>;
}

// Pre-bind the backend createActor so all components can call useActor() with no args.
// Cast the actor to the full typed interface.
export function useActor(): {
  actor: FullBackendActor | null;
  isFetching: boolean;
} {
  const result = _useActor(createActor);
  return {
    actor: result.actor as unknown as FullBackendActor | null,
    isFetching: result.isFetching,
  };
}
