"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import type { PersonaPerformanceRow } from "@/lib/supabase"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { parseConversationsSummary } from "@/lib/parsers"

interface AppointmentsFunnelProps {
  conversations: PersonaPerformanceRow[]
}

export function AppointmentsFunnel({ conversations }: AppointmentsFunnelProps) {
  const funnelData = useMemo(() => {
    const total = conversations.length
    const successful = conversations.filter((c) => c.avg_score >= 8).length
    const booked = conversations.filter((conv) => {
      const summary = parseConversationsSummary(conv.conversations_summary)
      return summary.some((s: any) => s.appointment_booked === true)
    }).length

    return [
      {
        name: "Total",
        value: total,
        percentage: 100,
        color: "hsl(var(--primary))",
      },
      {
        name: "Successful",
        value: successful,
        percentage: total > 0 ? Math.round((successful / total) * 100) : 0,
        color: "hsl(var(--chart-2))",
      },
      {
        name: "Booked",
        value: booked,
        percentage: total > 0 ? Math.round((booked / total) * 100) : 0,
        color: "hsl(var(--chart-3))",
      },
    ]
  }, [conversations])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Appointments Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={funnelData} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.value} conversations ({data.percentage}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {funnelData.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{item.value}</span>
                <span className="font-medium">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
