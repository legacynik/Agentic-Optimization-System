"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts"
import { Activity, Target, TrendingUp, Timer, ExternalLink } from "lucide-react"

interface DashboardStats {
  totalRuns: number
  avgScore: number | null
  successRate: number
  avgTurns: number
}

interface ScoreTrend {
  date: string
  score: number
  testRunCode: string
}

interface CriteriaAvg {
  name: string
  avgScore: number
}

interface TestRunRow {
  id: string
  test_run_code: string
  status: string
  overall_score: number | null
  success_count: number
  failure_count: number
  timeout_count: number
  started_at: string
  prompt_name: string
  prompt_version: string
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  running: "secondary",
  pending: "outline",
  failed: "destructive",
  aborted: "destructive",
  evaluating: "secondary",
  battles_completed: "secondary",
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trend, setTrend] = useState<ScoreTrend[]>([])
  const [criteria, setCriteria] = useState<CriteriaAvg[]>([])
  const [runs, setRuns] = useState<TestRunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/dashboard/trend').then(r => r.json()),
      fetch('/api/dashboard/criteria').then(r => r.json()),
      fetch('/api/test-runs?limit=10&order=desc').then(r => r.json()),
    ]).then(([statsRes, trendRes, criteriaRes, runsRes]) => {
      setStats(statsRes.data)
      setTrend(trendRes.data || [])
      setCriteria(criteriaRes.data || [])
      setRuns(runsRes.data || [])
    }).catch(() => {
      setError('Failed to load dashboard data. Please refresh the page.')
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Runs" value={stats?.totalRuns ?? 0} icon={<Activity className="h-5 w-5" />} />
        <KPICard title="Avg Score" value={stats?.avgScore?.toFixed(1) ?? '—'} icon={<Target className="h-5 w-5" />} />
        <KPICard title="Success Rate" value={`${stats?.successRate?.toFixed(0) ?? 0}%`} icon={<TrendingUp className="h-5 w-5" />} />
        <KPICard title="Avg Turns" value={stats?.avgTurns?.toFixed(1) ?? '—'} icon={<Timer className="h-5 w-5" />} />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Score Trend */}
        <Card>
          <CardHeader><CardTitle>Score Trend</CardTitle></CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No completed runs yet</p>
            )}
          </CardContent>
        </Card>

        {/* Criteria Radar */}
        <Card>
          <CardHeader><CardTitle>Criteria Breakdown</CardTitle></CardHeader>
          <CardContent>
            {criteria.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={criteria}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis domain={[0, 10]} />
                  <Radar dataKey="avgScore" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No evaluation data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Test Runs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Test Runs</CardTitle>
            <Link href="/test-runs" className="text-sm text-primary hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>S / F / T</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length > 0 ? runs.map(run => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono">{run.test_run_code}</TableCell>
                  <TableCell>{run.prompt_name} v{run.prompt_version}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[run.status] || "outline"}>{run.status}</Badge>
                  </TableCell>
                  <TableCell>{run.overall_score?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell>
                    <span className="text-green-600">{run.success_count}</span>
                    {' / '}
                    <span className="text-red-600">{run.failure_count}</span>
                    {' / '}
                    <span className="text-yellow-600">{run.timeout_count}</span>
                  </TableCell>
                  <TableCell>{new Date(run.started_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/test-runs/${run.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No test runs yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function KPICard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-[150px]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
      <Skeleton className="h-[300px]" />
    </div>
  )
}
