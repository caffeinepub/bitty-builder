/* eslint-disable */

// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface LeaderboardEntry {
  'nickname' : string,
  'rank' : bigint,
  'score' : bigint,
  'timestamp' : bigint,
}
export interface ScoreEntry {
  'principal' : Principal,
  'nickname' : string,
  'score' : bigint,
  'timestamp' : bigint,
}
export interface ChatMessage {
  'id' : bigint,
  'author' : Principal,
  'nickname' : string,
  'text' : string,
  'timestamp' : bigint,
}
export interface UserProfile { 'name' : string }
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export interface _SERVICE {
  '_initializeAccessControlWithSecret' : ActorMethod<[string], undefined>,
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'getAllScores' : ActorMethod<[], Array<ScoreEntry>>,
  'getAllTimeLeaderboard' : ActorMethod<[], Array<LeaderboardEntry>>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getMyNickname' : ActorMethod<[], [] | [string]>,
  'getTopScores' : ActorMethod<[], Array<ScoreEntry>>,
  'getTopScoresForUser' : ActorMethod<[Principal], Array<ScoreEntry>>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getWeeklyLeaderboard' : ActorMethod<[], Array<LeaderboardEntry>>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'isNicknameAvailable' : ActorMethod<[string], boolean>,
  'registerNickname' : ActorMethod<[string], undefined>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'submitScore' : ActorMethod<[bigint], undefined>,
  'getChatMessages' : ActorMethod<[], Array<ChatMessage>>,
  'sendChatMessage' : ActorMethod<[string], undefined>,
  'deleteOwnChatMessage' : ActorMethod<[bigint], undefined>,
  'adminDeleteChatMessage' : ActorMethod<[bigint, string], undefined>,
  'adminResetWeeklyLeaderboard' : ActorMethod<[string], undefined>,
  'adminSetWeeklyResetTime' : ActorMethod<[string, bigint], undefined>,
  'adminSetTournamentStart' : ActorMethod<[string, bigint], undefined>,
  'adminInsertScore' : ActorMethod<[string, string, bigint], undefined>,
  'changeNickname' : ActorMethod<[string], undefined>,
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
