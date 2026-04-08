import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Entry } from "../backend.d";
import { useActor } from "./useActor";

export function useLeaderboard() {
  const { actor, isFetching } = useActor();
  return useQuery<Entry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playerName,
      score,
    }: { playerName: string; score: number }) => {
      if (!actor) throw new Error("No actor");
      await actor.submitScore(playerName, BigInt(score));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
