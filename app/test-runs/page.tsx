"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink } from "lucide-react"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  running: "secondary",
  pending: "outline",
  failed: "destructive",
  aborted: "destructive",
  evaluating: "secondary",
  battles_completed: "secondary",
}

interface TestRunRow {
  id: string
  test_run_code: string
  status: string
  mode: string
  overall_score: number | null
  success_count: number
  failure_count: number
  timeout_count: number
  started_at: string
  completed_at: string | null
  prompt_name: string
  prompt_version: string
}

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetch('/api/test-runs?limit=100&order=desc')
      .then(r => r.json())
      .then(result => setRuns(result.data || []))
      .finally(() => setLoading(false))
  }, [])

  const filteredRuns = statusFilter === "all"
    ? runs
    : runs.filter(r => r.status === statusFilter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Test Runs</h1>
          <p className="text-muted-foreground">All test run executions</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="aborted">Aborted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>S / F / T</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.map(run => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono">{run.test_run_code}</TableCell>
                    <TableCell>{run.prompt_name} v{run.prompt_version}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[run.status] || "outline"}>{run.status}</Badge>
                    </TableCell>
                    <TableCell>{run.overall_score?.toFixed(1) ?? '—'}</TableCell>
                    <TableCell>
                      <span className="text-green-600">{run.success_count}</span>
                      {' / '}<span className="text-red-600">{run.failure_count}</span>
                      {' / '}<span className="text-yellow-600">{run.timeout_count}</span>
                    </TableCell>
                    <TableCell>{new Date(run.started_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/test-runs/${run.id}`}>
                        <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRuns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No test runs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
