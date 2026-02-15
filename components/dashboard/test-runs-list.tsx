"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TestRun {
  id: string
  avgScore: number
  date: string
  distribution: {
    success: number
    partial: number
    failure: number
  }
}

interface TestRunsListProps {
  testRuns: TestRun[]
  maxItems?: number
}

export function TestRunsList({ testRuns, maxItems = 5 }: TestRunsListProps) {
  const displayedRuns = testRuns.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Test Runs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedRuns.map((run) => (
          <Card key={run.id} className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-foreground">{run.id}</span>
                <Badge variant="secondary">{run.avgScore}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{run.date}</p>
              <div className="flex gap-2 text-xs">
                <Badge
                  variant="outline"
                  className="bg-secondary/20 text-secondary-foreground border-secondary"
                >
                  {run.distribution.success} success
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-accent/20 text-accent-foreground border-accent"
                >
                  {run.distribution.partial} partial
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-destructive/20 text-destructive-foreground border-destructive"
                >
                  {run.distribution.failure} fail
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}
