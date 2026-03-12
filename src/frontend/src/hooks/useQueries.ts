import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

export function useAllTimeLeaderboard() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["leaderboard", "alltime"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTimeLeaderboard();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useWeeklyLeaderboard() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["leaderboard", "weekly"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWeeklyLeaderboard();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useMyNickname() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["nickname", "mine"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyNickname();
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useCheckNickname(nickname: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["nickname", "check", nickname],
    queryFn: async () => {
      if (!actor || !nickname.trim()) return null;
      return actor.isNicknameAvailable(nickname.trim());
    },
    enabled: !!actor && !isFetching && nickname.trim().length >= 2,
    staleTime: 5_000,
  });
}

export function useRegisterNickname() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nickname: string) => {
      if (!actor) throw new Error("Not connected");
      await actor.registerNickname(nickname.trim());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nickname"] });
    },
  });
}

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (score: number) => {
      if (!actor) throw new Error("Not connected");
      await actor.submitScore(BigInt(score));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
