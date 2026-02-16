import { useQuery } from "@tanstack/react-query"
import { fetchHeatmapData } from "@/lib/queries"

export function useHeatmapQuery() {
  return useQuery({
    queryKey: ["heatmap"],
    queryFn: fetchHeatmapData,
  })
}
