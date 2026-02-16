import { useQuery } from "@tanstack/react-query"
import { fetchUniquePersonas } from "@/lib/queries"

export function usePersonasQuery() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: fetchUniquePersonas,
  })
}
