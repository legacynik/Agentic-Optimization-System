"use client"

interface PersonasHeatmapProps {
  data: Array<{
    persona: string
    [key: string]: number | string
  }>
}

function getColorIntensity(score: number): string {
  if (score >= 8) return "bg-emerald-500 text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]"
  if (score >= 6) return "bg-yellow-400 text-black font-bold"
  if (score >= 4) return "bg-orange-500 text-white font-semibold"
  return "bg-red-500 text-white font-bold"
}

export function PersonasHeatmap({ data }: PersonasHeatmapProps) {
  console.log("[v0] Heatmap rendering with data:", data)

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No heatmap data available
      </div>
    )
  }

  const criteria = Object.keys(data[0]).filter((key) => key !== "persona")
  console.log("[v0] Extracted criteria:", criteria)

  if (criteria.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No criteria found in data
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* Header */}
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `200px repeat(${criteria.length}, 1fr)` }}>
          <div className="text-xs font-medium text-muted-foreground">Persona ID</div>
          {criteria.map((criterion) => (
            <div key={criterion} className="text-xs font-medium text-center text-muted-foreground truncate">
              {criterion}
            </div>
          ))}
        </div>

        {/* Heatmap Rows */}
        <div className="space-y-2">
          {data.map((row, idx) => (
            <div
              key={idx}
              className="grid gap-2"
              style={{ gridTemplateColumns: `200px repeat(${criteria.length}, 1fr)` }}
            >
              <div className="text-xs font-medium text-foreground flex items-center pr-2">{row.persona}</div>
              {criteria.map((criterion) => {
                const value = row[criterion]
                const score = typeof value === "number" ? value : 0
                return (
                  <div
                    key={criterion}
                    className={`text-xs font-semibold rounded px-2 py-3 text-center ${getColorIntensity(score)}`}
                  >
                    {typeof value === "number" ? value.toFixed(1) : "N/A"}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
