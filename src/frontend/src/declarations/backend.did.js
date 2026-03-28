/* eslint-disable */

// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

export const UserRole = IDL.Variant({
  'admin' : IDL.Null,
  'user' : IDL.Null,
  'guest' : IDL.Null,
});
export const ScoreEntry = IDL.Record({
  'principal' : IDL.Principal,
  'nickname' : IDL.Text,
  'score' : IDL.Nat,
  'timestamp' : IDL.Int,
});
export const LeaderboardEntry = IDL.Record({
  'nickname' : IDL.Text,
  'rank' : IDL.Nat,
  'score' : IDL.Nat,
  'timestamp' : IDL.Int,
});
export const ChatMessage = IDL.Record({
  'id' : IDL.Nat,
  'author' : IDL.Principal,
  'nickname' : IDL.Text,
  'text' : IDL.Text,
  'timestamp' : IDL.Int,
});
export const UserProfile = IDL.Record({ 'name' : IDL.Text });

export const idlService = IDL.Service({
  '_initializeAccessControlWithSecret' : IDL.Func([IDL.Text], [], []),
  'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
  'getAllScores' : IDL.Func([], [IDL.Vec(ScoreEntry)], ['query']),
  'getAllTimeLeaderboard' : IDL.Func(
      [],
      [IDL.Vec(LeaderboardEntry)],
      ['query'],
    ),
  'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
  'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
  'getMyNickname' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
  'getTopScores' : IDL.Func([], [IDL.Vec(ScoreEntry)], ['query']),
  'getTopScoresForUser' : IDL.Func(
      [IDL.Principal],
      [IDL.Vec(ScoreEntry)],
      ['query'],
    ),
  'getUserProfile' : IDL.Func(
      [IDL.Principal],
      [IDL.Opt(UserProfile)],
      ['query'],
    ),
  'getWeeklyLeaderboard' : IDL.Func([], [IDL.Vec(LeaderboardEntry)], ['query']),
  'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
  'isNicknameAvailable' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
  'registerNickname' : IDL.Func([IDL.Text], [], []),
  'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
  'submitScore' : IDL.Func([IDL.Nat], [], []),
  'getChatMessages' : IDL.Func([], [IDL.Vec(ChatMessage)], ['query']),
  'sendChatMessage' : IDL.Func([IDL.Text], [], []),
  'deleteOwnChatMessage' : IDL.Func([IDL.Nat], [], []),
  'adminDeleteChatMessage' : IDL.Func([IDL.Nat, IDL.Text], [], []),
  'adminResetWeeklyLeaderboard' : IDL.Func([IDL.Text], [], []),
  'adminSetWeeklyResetTime' : IDL.Func([IDL.Text, IDL.Int], [], []),
  'changeNickname' : IDL.Func([IDL.Text], [], []),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const ScoreEntry = IDL.Record({
    'principal' : IDL.Principal,
    'nickname' : IDL.Text,
    'score' : IDL.Nat,
    'timestamp' : IDL.Int,
  });
  const LeaderboardEntry = IDL.Record({
    'nickname' : IDL.Text,
    'rank' : IDL.Nat,
    'score' : IDL.Nat,
    'timestamp' : IDL.Int,
  });
  const ChatMessage = IDL.Record({
    'id' : IDL.Nat,
    'author' : IDL.Principal,
    'nickname' : IDL.Text,
    'text' : IDL.Text,
    'timestamp' : IDL.Int,
  });
  const UserProfile = IDL.Record({ 'name' : IDL.Text });
  
  return IDL.Service({
    '_initializeAccessControlWithSecret' : IDL.Func([IDL.Text], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'getAllScores' : IDL.Func([], [IDL.Vec(ScoreEntry)], ['query']),
    'getAllTimeLeaderboard' : IDL.Func(
        [],
        [IDL.Vec(LeaderboardEntry)],
        ['query'],
      ),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getMyNickname' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'getTopScores' : IDL.Func([], [IDL.Vec(ScoreEntry)], ['query']),
    'getTopScoresForUser' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(ScoreEntry)],
        ['query'],
      ),
    'getUserProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'getWeeklyLeaderboard' : IDL.Func(
        [],
        [IDL.Vec(LeaderboardEntry)],
        ['query'],
      ),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'isNicknameAvailable' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'registerNickname' : IDL.Func([IDL.Text], [], []),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'submitScore' : IDL.Func([IDL.Nat], [], []),
    'getChatMessages' : IDL.Func([], [IDL.Vec(ChatMessage)], ['query']),
    'sendChatMessage' : IDL.Func([IDL.Text], [], []),
    'deleteOwnChatMessage' : IDL.Func([IDL.Nat], [], []),
    'adminDeleteChatMessage' : IDL.Func([IDL.Nat, IDL.Text], [], []),
    'adminResetWeeklyLeaderboard' : IDL.Func([IDL.Text], [], []),
    'adminSetWeeklyResetTime' : IDL.Func([IDL.Text, IDL.Int], [], []),
    'changeNickname' : IDL.Func([IDL.Text], [], []),
  });
};

export const init = ({ IDL }) => { return []; };
