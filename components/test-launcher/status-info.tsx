interface StatusInfoProps {
  status: string
  avgScore: number | null
  totalPersonas: number
  errorMessage: string | null
}

export function StatusInfo({ status, avgScore, totalPersonas, errorMessage }: StatusInfoProps) {
  if (status === "pending") {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Waiting to start...</span>
      </div>
    )
  }

  if (status === "completed" && avgScore !== null) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Avg Score: </span>
          <span className="font-semibold">{avgScore.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Personas: </span>
          <span className="font-semibold">{totalPersonas}</span>
        </div>
      </div>
    )
  }

  if (status === "failed" && errorMessage) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {errorMessage}
      </div>
    )
  }

  return null
}
