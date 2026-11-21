import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { AgentView } from '@/contracts/tasker';

export const agentKeys = { all: ['agents'] as const };

export const agentsQuery = () =>
  queryOptions({
    queryKey: agentKeys.all,
    queryFn: async ({ signal }) => (await api.get<{ items: AgentView[] }>('/agents/many', {}, signal)).items,
    staleTime: 10 * 60_000,
  });

/** The agents items can be assigned to; `[]` while loading or when the server has none. */
export function useAgents() {
  const q = useQuery(agentsQuery());
  return q.data ?? [];
}

export const findAgent = (agents: AgentView[], slug: string | undefined) => (slug ? agents.find((a) => a.slug === slug) : undefined);
