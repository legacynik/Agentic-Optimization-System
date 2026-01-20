'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BattleArena } from '@/components/agentic/battle-arena'
import { PersonaGenerator } from '@/components/agentic/persona-generator'
import { OptimizationLoop } from '@/components/agentic/optimization-loop'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Brain,
  Zap,
  Users,
  TrendingUp,
  Target,
  Activity,
  GitBranch,
  Sparkles,
  PlayCircle,
  Settings,
  ChevronRight
} from 'lucide-react'

export default function AgenticDashboard() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Map URL param to tab value
  const defaultTab = tabParam === 'personas' ? 'personas' :
                     tabParam === 'optimization' ? 'optimization' :
                     tabParam === 'analytics' ? 'analytics' : 'battle'

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Agentic Testing System
          </h1>
          <p className="text-muted-foreground mt-2">
            Scalare senza assumere - Il futuro del testing automatizzato degli agenti AI
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            N8N Config
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Full Cycle
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Battles Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +23% this week
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Personas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Users className="w-3 h-3 mr-1" />
              12 categories
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <Target className="w-3 h-3 mr-1" />
              Above target
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Optimization Cycles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <div className="flex items-center text-xs text-orange-600 mt-1">
              <GitBranch className="w-3 h-3 mr-1" />
              3 running now
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-gray-100/50 dark:bg-gray-800/50">
          <TabsTrigger
            value="battle"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Battle Arena
          </TabsTrigger>
          <TabsTrigger
            value="personas"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            Persona Generator
          </TabsTrigger>
          <TabsTrigger
            value="optimization"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Optimization Loop
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
          >
            <Activity className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="battle" className="space-y-6">
          <BattleArena />

          {/* Recent Battles */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Battles</CardTitle>
              <CardDescription>
                Latest test runs from your N8N workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        A{i}
                      </div>
                      <div>
                        <p className="font-medium">Agent v2.{i} vs Paziente Ansioso</p>
                        <p className="text-sm text-muted-foreground">TestRun-2024-{1000 + i}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={i === 1 ? 'default' : 'secondary'}>
                        {i === 1 ? 'Running' : 'Completed'}
                      </Badge>
                      <Badge variant="outline">
                        {20 + i * 3} turns
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas" className="space-y-6">
          <PersonaGenerator />
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-green-500" />
                Optimization Loop
              </CardTitle>
              <CardDescription>
                Ciclo automatico di ottimizzazione basato sui risultati delle battle
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground">Component coming soon...</p>
              <p className="text-sm mt-2">Il loop di ottimizzazione automatica sarà qui</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                Advanced Analytics
              </CardTitle>
              <CardDescription>
                Pattern recognition e predictive analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground">Analytics engine coming soon...</p>
              <p className="text-sm mt-2">Analisi avanzate e suggerimenti di ottimizzazione</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Status Bar */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">N8N Workflows: Connected</span>
              </div>
              <Badge variant="outline">3 workflows active</Badge>
              <Badge variant="outline">Supabase: dlozxirsmrbriuklgcxq</Badge>
            </div>
            <Button size="sm" variant="ghost">
              View Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}