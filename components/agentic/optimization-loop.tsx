'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  GitBranch,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Zap,
  Brain,
  Target,
  BarChart3,
  GitCompare
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OptimizationCycle {
  id: string
  version: string
  status: 'running' | 'completed' | 'failed'
  startTime: Date
  metrics: {
    successRate: number
    avgTurns: number
    avgScore: number
  }
  improvements: string[]
}

export function OptimizationLoop() {
  const [activeCycle, setActiveCycle] = useState<OptimizationCycle | null>(null)
  const [cycles, setCycles] = useState<OptimizationCycle[]>([
    {
      id: 'cycle-1',
      version: 'v2.1 → v2.2',
      status: 'completed',
      startTime: new Date(Date.now() - 3600000),
      metrics: {
        successRate: 78,
        avgTurns: 28,
        avgScore: 7.2
      },
      improvements: [
        'Migliorata gestione obiezioni',
        'Ridotto tempo di risposta',
        'Aggiunto recap strategico'
      ]
    },
    {
      id: 'cycle-2',
      version: 'v2.2 → v2.3',
      status: 'running',
      startTime: new Date(Date.now() - 600000),
      metrics: {
        successRate: 82,
        avgTurns: 25,
        avgScore: 7.8
      },
      improvements: [
        'Discovery socratica ottimizzata',
        'Linguaggio più naturale',
        'Edge cases gestiti meglio'
      ]
    }
  ])

  const startNewCycle = () => {
    const newCycle: OptimizationCycle = {
      id: `cycle-${cycles.length + 1}`,
      version: 'v2.3 → v2.4',
      status: 'running',
      startTime: new Date(),
      metrics: {
        successRate: 0,
        avgTurns: 0,
        avgScore: 0
      },
      improvements: []
    }
    setCycles([...cycles, newCycle])
    setActiveCycle(newCycle)
  }

  const OptimizationPhase = ({
    phase,
    status,
    description
  }: {
    phase: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    description: string
  }) => (
    <div className="flex items-start gap-3">
      <div className="mt-1">
        {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
        {status === 'running' && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
        {status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
        {status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
      </div>
      <div className="flex-1">
        <h4 className="font-medium">{phase}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Main Optimization Control */}
      <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-green-950/20 dark:via-gray-900 dark:to-emerald-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-green-500" />
                Optimization Loop Controller
              </CardTitle>
              <CardDescription>
                Ciclo automatico di testing e ottimizzazione con feedback loop
              </CardDescription>
            </div>
            <Button
              onClick={startNewCycle}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start New Cycle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Optimization Pipeline Visualization */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-4">Pipeline di Ottimizzazione</h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { icon: Brain, label: 'Analyze', color: 'purple' },
                  { icon: Target, label: 'Test', color: 'blue' },
                  { icon: BarChart3, label: 'Evaluate', color: 'orange' },
                  { icon: GitCompare, label: 'Compare', color: 'green' },
                  { icon: Zap, label: 'Deploy', color: 'yellow' }
                ].map((step, idx) => (
                  <div key={idx} className="relative">
                    <motion.div
                      className={`p-3 rounded-lg bg-${step.color}-100 dark:bg-${step.color}-900/30 flex flex-col items-center gap-2`}
                      whileHover={{ scale: 1.05 }}
                    >
                      <step.icon className={`w-6 h-6 text-${step.color}-600`} />
                      <span className="text-xs font-medium">{step.label}</span>
                    </motion.div>
                    {idx < 4 && (
                      <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Current Cycle Status */}
            {activeCycle && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Current Cycle: {activeCycle.version}</h3>
                    <Badge
                      variant={activeCycle.status === 'running' ? 'default' : 'secondary'}
                      className={activeCycle.status === 'running' ? 'animate-pulse' : ''}
                    >
                      {activeCycle.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>67%</span>
                      </div>
                      <Progress value={67} className="h-2" />
                    </div>

                    <div className="space-y-3">
                      <OptimizationPhase
                        phase="1. Battle Execution"
                        status="completed"
                        description="50 battles completate con diverse personas"
                      />
                      <OptimizationPhase
                        phase="2. Analytics & Scoring"
                        status="completed"
                        description="Analisi completata, pattern identificati"
                      />
                      <OptimizationPhase
                        phase="3. Optimization Suggestions"
                        status="running"
                        description="Generazione suggerimenti basati su AI..."
                      />
                      <OptimizationPhase
                        phase="4. Implementation"
                        status="pending"
                        description="Applicazione modifiche al prompt"
                      />
                      <OptimizationPhase
                        phase="5. Validation"
                        status="pending"
                        description="Test di validazione con nuovo prompt"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison Results</CardTitle>
          <CardDescription>
            Confronto tra versioni dopo ottimizzazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="improvements">Improvements</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                {cycles.slice(-2).map((cycle, idx) => (
                  <Card key={cycle.id} className={idx === 1 ? 'border-green-500' : ''}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{cycle.version.split(' → ')[idx]}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                          <p className="text-xl font-bold">{cycle.metrics.successRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Turns</p>
                          <p className="text-xl font-bold">{cycle.metrics.avgTurns}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p className="text-xl font-bold">{cycle.metrics.avgScore}/10</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="border-2 border-green-500 bg-green-50/50 dark:bg-green-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Improvement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                        <p className="text-xl font-bold text-green-600">+4%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Turns Reduced</p>
                        <p className="text-xl font-bold text-green-600">-3</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Score Increase</p>
                        <p className="text-xl font-bold text-green-600">+0.6</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="improvements" className="space-y-4 mt-4">
              {cycles[cycles.length - 1].improvements.map((improvement, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{improvement}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Implementato automaticamente dal sistema di ottimizzazione
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <div className="space-y-3">
                {cycles.map((cycle) => (
                  <div key={cycle.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{cycle.version}</p>
                        <p className="text-sm text-muted-foreground">
                          Started {cycle.startTime.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cycle.status === 'completed' ? 'secondary' : 'default'}>
                        {cycle.status}
                      </Badge>
                      <Badge variant="outline">
                        Score: {cycle.metrics.avgScore}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}