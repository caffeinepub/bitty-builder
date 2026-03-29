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
    nickname: string;
    rank: bigint;
    score: bigint;
    timestamp: bigint;
    principal: Principal;
    shareCount: bigint;
}
export interface ScoreEntry {
    principal: Principal;
    nickname: string;
    score: bigint;
    timestamp: bigint;
}
export interface ChatMessage {
    id: bigint;
    author: Principal;
    nickname: string;
    text: string;
    timestamp: bigint;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    changeNickname(newNickname: string): Promise<void>;
    getAllScores(): Promise<Array<ScoreEntry>>;
    getAllTimeLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMyNickname(): Promise<string | null>;
    getTopScores(): Promise<Array<ScoreEntry>>;
    getTopScoresForUser(user: Principal): Promise<Array<ScoreEntry>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWeeklyLeaderboard(): Promise<Array<LeaderboardEntry>>;
    isCallerAdmin(): Promise<boolean>;
    isNicknameAvailable(nickname: string): Promise<boolean>;
    registerNickname(nickname: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitScore(score: bigint): Promise<void>;
    recordShare(): Promise<void>;
    getChatMessages(): Promise<Array<ChatMessage>>;
    sendChatMessage(text: string): Promise<void>;
    deleteOwnChatMessage(id: bigint): Promise<void>;
    adminDeleteChatMessage(id: bigint, password: string): Promise<void>;
    adminResetWeeklyLeaderboard(password: string): Promise<void>;
    adminSetWeeklyResetTime(password: string, timestampNs: bigint): Promise<void>;
    adminSetTournamentStart(password: string, timestampNs: bigint): Promise<void>;
    adminInsertScore(password: string, nickname: string, score: bigint): Promise<void>;
}
