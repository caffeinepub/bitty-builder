import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LeaderboardEntry {
    principal: Principal;
    nickname: string;
    rank: bigint;
    score: bigint;
    shareCount: bigint;
    timestamp: bigint;
}
export interface ChatMessage {
    id: bigint;
    nickname: string;
    text: string;
    author: Principal;
    timestamp: bigint;
}
export interface DuelResult {
    id: string;
    matchedAt?: bigint;
    expiresAt: bigint;
    challengerNickname: string;
    winnerId?: Principal;
    opponentNickname?: string;
    opponentScore?: bigint;
    createdAt: bigint;
    state: DuelState;
    challengerScore?: bigint;
    amount: bigint;
    challenger: Principal;
    opponent?: Principal;
}
export interface ScoreEntry {
    principal: Principal;
    nickname: string;
    score: bigint;
    timestamp: bigint;
}
export enum DuelState {
    resolved = "resolved",
    expired = "expired",
    opponent_played = "opponent_played",
    open = "open",
    matched = "matched",
    challenger_played = "challenger_played"
}
export interface backendInterface {
    acceptDuelChallenge(duelId: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminDeleteChatMessage(id: bigint, password: string): Promise<void>;
    adminInsertScore(password: string, nickname: string, score: bigint): Promise<void>;
    adminResetWeeklyLeaderboard(password: string): Promise<void>;
    adminSetTournamentStart(password: string, newTimestampNs: bigint): Promise<void>;
    adminSetWeeklyResetTime(password: string, newTimestampNs: bigint): Promise<void>;
    changeNickname(newNickname: string): Promise<void>;
    deleteOwnChatMessage(id: bigint): Promise<void>;
    expireOldDuels(): Promise<void>;
    getAllScores(): Promise<Array<ScoreEntry>>;
    getAllTimeLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getBittyBalance(owner: Principal): Promise<bigint>;
    getChatMessages(): Promise<Array<ChatMessage>>;
    getDuelHistory(): Promise<Array<DuelResult>>;
    getIcpBalance(owner: Principal): Promise<bigint>;
    getMyDuels(): Promise<Array<DuelResult>>;
    getMyNickname(): Promise<string | null>;
    getOpenDuels(): Promise<Array<DuelResult>>;
    getTopScores(): Promise<Array<ScoreEntry>>;
    getTopScoresForUser(user: Principal): Promise<Array<ScoreEntry>>;
    getWeeklyLeaderboard(): Promise<Array<LeaderboardEntry>>;
    isNicknameAvailable(nickname: string): Promise<boolean>;
    playDuel(duelId: string, score: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    postDuelChallenge(amount: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recordShare(): Promise<void>;
    registerNickname(nickname: string): Promise<void>;
    sendChatMessage(text: string): Promise<void>;
    submitScore(score: bigint): Promise<void>;
}
