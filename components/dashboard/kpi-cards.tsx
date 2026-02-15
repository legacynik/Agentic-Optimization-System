"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, TrendingUp, CheckCircle2, Zap, Calendar } from "lucide-react"

interface KPICardsProps {
  totalTests: number
  avgScore: string
  successRate: string
  totalAppointments: number
  totalConversations: number
  avgEfficiency: string
  filteredTestRunsCount: number
}

export function KPICards({
  totalTests,
  avgScore,
  successRate,
  totalAppointments,
  totalConversations,
  avgEfficiency,
  filteredTestRunsCount,
}: KPICardsProps) {
  const appointmentRate = totalConversations > 0
    ? ((totalAppointments / totalConversations) * 100).toFixed(1)
    : "0"

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Tests
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalTests}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {filteredTestRunsCount} test runs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Score
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{avgScore}</div>
          <p className="text-xs text-muted-foreground mt-1">Out of 10.0</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Success Rate
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{successRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">Successful outcomes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Appointments
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalAppointments}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalConversations > 0
              ? `${appointmentRate}% booking rate`
              : "No data"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Efficiency
          </CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{avgEfficiency}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Turns per conversation (excl. timeouts)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
