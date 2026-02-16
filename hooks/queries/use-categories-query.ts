import { useQuery } from "@tanstack/react-query"
import { fetchUniqueCategories } from "@/lib/queries"

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchUniqueCategories,
  })
}
