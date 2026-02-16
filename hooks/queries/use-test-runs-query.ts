import { useQuery } from "@tanstack/react-query"
import { fetchTestRuns } from "@/lib/queries"

export function useTestRunsQuery() {
  return useQuery({
    queryKey: ["testRuns"],
    queryFn: fetchTestRuns,
  })
}
