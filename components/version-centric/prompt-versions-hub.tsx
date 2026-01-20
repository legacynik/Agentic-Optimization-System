'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  GitBranch,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  TestTube,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PromptVersion {
  id: string
  prompt_name: string
  version: string
  status: 'draft' | 'testing' | 'production' | 'archived'
  avg_success_rate: number
  avg_score: number
  total_test_runs: number
  created_at: string
  last_tested?: string
}

interface PromptGroup {
  name: string
  versions: PromptVersion[]
  isExpanded: boolean
}

export function PromptVersionsHub() {
  const [promptGroups, setPromptGroups] = useState<PromptGroup[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)

  // Mock data - replace with Supabase query
  useEffect(() => {
    const mockData: PromptGroup[] = [
      {
        name: 'Medical Audit Assistant',
        isExpanded: true,
        versions: [
          {
            id: '1',
            prompt_name: 'Medical Audit Assistant',
            version: 'v3.0',
            status: 'production',
            avg_success_rate: 87,
            avg_score: 8.5,
            total_test_runs: 156,
            created_at: '2024-01-15',
            last_tested: '2024-01-18'
          },
          {
            id: '2',
            prompt_name: 'Medical Audit Assistant',
            version: 'v2.0',
            status: 'archived',
            avg_success_rate: 72,
            avg_score: 7.2,
            total_test_runs: 89,
            created_at: '2024-01-10',
            last_tested: '2024-01-14'
          },
          {
            id: '3',
            prompt_name: 'Medical Audit Assistant',
            version: 'v1.0',
            status: 'archived',
            avg_success_rate: 61,
            avg_score: 6.1,
            total_test_runs: 45,
            created_at: '2024-01-05',
            last_tested: '2024-01-09'
          }
        ]
      },
      {
        name: 'Customer Service Bot',
        isExpanded: false,
        versions: [
          {
            id: '4',
            prompt_name: 'Customer Service Bot',
            version: 'v2.1',
            status: 'testing',
            avg_success_rate: 79,
            avg_score: 7.9,
            total_test_runs: 203,
            created_at: '2024-01-12',
            last_tested: '2024-01-18'
          },
          {
            id: '5',
            prompt_name: 'Customer Service Bot',
            version: 'v1.0',
            status: 'archived',
            avg_success_rate: 54,
            avg_score: 5.4,
            total_test_runs: 67,
            created_at: '2024-01-01',
            last_tested: '2024-01-11'
          }
        ]
      }
    ]

    setPromptGroups(mockData)
  }, [])

  const toggleGroup = (groupName: string) => {
    setPromptGroups(prev => prev.map(group =>
      group.name === groupName
        ? { ...group, isExpanded: !group.isExpanded }
        : group
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production': return 'bg-green-500'
      case 'testing': return 'bg-blue-500'
      case 'draft': return 'bg-yellow-500'
      case 'archived': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getPerformanceTrend = (versions: PromptVersion[]) => {
    if (versions.length < 2) return null
    const latest = versions[0].avg_score
    const previous = versions[1].avg_score
    const delta = latest - previous

    if (delta > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    } else if (delta < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />
    }
    return null
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Prompt Versions Control Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all prompt versions and their performance
          </p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create New Prompt
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Prompts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promptGroups.length}</div>
            <p className="text-xs text-muted-foreground">
              {promptGroups.reduce((acc, g) => acc + g.versions.length, 0)} total versions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82.3%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              +5.2% from last week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tests This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">347</div>
            <p className="text-xs text-muted-foreground">
              Across 8 versions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Optimization Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+1.3</div>
            <p className="text-xs text-muted-foreground">
              Avg score improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prompt Groups */}
      <div className="space-y-4">
        {promptGroups.map((group) => (
          <Card key={group.name} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              onClick={() => toggleGroup(group.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className="w-5 h-5 text-purple-500" />
                  <div>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      {group.versions.length} versions • Latest: {group.versions[0].version}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${getStatusColor(group.versions[0].status)} text-white`}
                    >
                      {group.versions[0].status}
                    </Badge>
                    {getPerformanceTrend(group.versions)}
                  </div>
                  {group.isExpanded ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>
            </CardHeader>

            <AnimatePresence>
              {group.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent className="pt-0">
                    {/* Version Timeline */}
                    <div className="relative pl-8 space-y-4">
                      {/* Vertical line */}
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-blue-500" />

                      {group.versions.map((version, idx) => (
                        <motion.div
                          key={version.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="relative"
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute -left-5 top-8 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                              idx === 0 ? 'bg-purple-500' : 'bg-gray-400'
                            }`}
                          />

                          {/* Version Card */}
                          <Card
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedPrompt === version.id
                                ? 'border-purple-500 shadow-lg'
                                : ''
                            }`}
                            onClick={() => setSelectedPrompt(version.id)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h3 className="font-semibold text-lg">{version.version}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Created {version.created_at}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {version.total_test_runs} tests
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Success Rate</p>
                                  <p className="text-lg font-bold">
                                    {version.avg_success_rate}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Avg Score</p>
                                  <p className="text-lg font-bold">
                                    {version.avg_score}/10
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Last Tested</p>
                                  <p className="text-sm font-medium">
                                    {version.last_tested || 'Never'}
                                  </p>
                                </div>
                              </div>

                              {/* Performance Bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>Performance</span>
                                  <span>{version.avg_score}/10</span>
                                </div>
                                <Progress
                                  value={version.avg_score * 10}
                                  className="h-2"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-4">
                                <Button size="sm" variant="outline">
                                  <TestTube className="w-4 h-4 mr-1" />
                                  Run Test
                                </Button>
                                {idx === 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                  >
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    Optimize
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost">
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    {/* Add Version Button */}
                    <div className="mt-4 pl-8">
                      <Button
                        variant="outline"
                        className="w-full border-dashed"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Version
                      </Button>
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>
    </div>
  )
}