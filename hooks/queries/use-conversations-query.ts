import { useQuery } from "@tanstack/react-query"
import { fetchPersonasPerformance } from "@/lib/queries"

export function useConversationsQuery() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: fetchPersonasPerformance,
  })
}
