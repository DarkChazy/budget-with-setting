import { useQuery, useQueryClient } from "@tanstack/react-query";
import { whoami } from "./api.functions";

export type CurrentUser = { id: string; name: string; email: string };

export function useCurrentUser() {
  const { data, isLoading } = useQuery({
    queryKey: ["whoami"],
    queryFn: () => whoami(),
    staleTime: 60_000,
  });
  return { user: (data ?? null) as CurrentUser | null, ready: !isLoading };
}

export function useInvalidateAuth() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["whoami"] });
}
