import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TestRunsCardProps {
  testRuns: any[]
}

export function TestRunsCard({ testRuns }: TestRunsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Test Runs</CardTitle>
        <CardDescription>Latest test executions with outcome distribution</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {testRuns.slice(0, 5).map((run) => (
          <div key={run.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium font-mono">{run.id}</p>
              <p className="text-xs text-muted-foreground">{run.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                {run.distribution.success}
              </Badge>
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                {run.distribution.partial}
              </Badge>
              <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                {run.distribution.failure}
              </Badge>
            </div>
          </div>
        ))}
        {testRuns.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No test runs found</p>
        )}
      </CardContent>
    </Card>
  )
}
