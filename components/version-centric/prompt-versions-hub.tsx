'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  GitBranch,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  TestTube,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  Check,
  Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  fetchPromptVersions,
  createPromptVersion,
  updatePromptVersion,
  deletePromptVersion,
  safeApiCall,
  type PromptVersionAPI
} from './prompt-versions/api-actions'

interface PromptGroup {
  name: string
  versions: PromptVersionAPI[]
  isExpanded: boolean
}

export function PromptVersionsHub() {
  const [versions, setVersions] = useState<PromptVersionAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForGroup, setCreateForGroup] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formVersion, setFormVersion] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formBusinessType, setFormBusinessType] = useState('')

  const loadVersions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const data = await safeApiCall(() => fetchPromptVersions())
    if (data) {
      setVersions(data)
      // Auto-expand first group
      const names = [...new Set(data.map(v => v.prompt_name))]
      if (names.length > 0 && expandedGroups.size === 0) {
        setExpandedGroups(new Set([names[0]]))
      }
    } else {
      setError('Failed to load prompt versions')
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  // Group versions by prompt_name
  const promptGroups: PromptGroup[] = useMemo(() => {
    const groupMap = new Map<string, PromptVersionAPI[]>()

    for (const v of versions) {
      const existing = groupMap.get(v.prompt_name) || []
      existing.push(v)
      groupMap.set(v.prompt_name, existing)
    }

    // Sort versions within each group: newest first
    return Array.from(groupMap.entries()).map(([name, vers]) => ({
      name,
      versions: vers.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      isExpanded: expandedGroups.has(name)
    }))
  }, [versions, expandedGroups])

  // Summary stats computed from real data
  const stats = useMemo(() => {
    const totalVersions = versions.length
    const uniquePrompts = promptGroups.length
    const withTests = versions.filter(v => (v.total_test_runs || 0) > 0)
    const avgSuccessRate = withTests.length > 0
      ? withTests.reduce((sum, v) => sum + (v.avg_success_rate || 0), 0) / withTests.length
      : 0
    const totalTests = versions.reduce((sum, v) => sum + (v.total_test_runs || 0), 0)
    const avgScoreImprovement = computeAvgImprovement(promptGroups)

    return { uniquePrompts, totalVersions, avgSuccessRate, totalTests, avgScoreImprovement }
  }, [versions, promptGroups])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  const openCreateDialog = (groupName: string | null) => {
    setCreateForGroup(groupName)
    setFormName(groupName || '')
    setFormVersion('')
    setFormContent('')
    setFormNotes('')
    setFormBusinessType('')
    setShowCreateDialog(true)
  }

  const handleCreate = async () => {
    if (!formName.trim() || !formVersion.trim() || !formContent.trim()) {
      toast.error('Name, version and content are required')
      return
    }

    setCreating(true)
    const result = await safeApiCall(() =>
      createPromptVersion({
        prompt_name: formName.trim(),
        version: formVersion.trim(),
        content: formContent.trim(),
        optimization_notes: formNotes.trim() || undefined,
        business_type: formBusinessType.trim() || undefined,
      })
    )

    if (result) {
      toast.success(`Created ${result.prompt_name} ${result.version}`)
      setShowCreateDialog(false)
      // Expand the new group
      setExpandedGroups(prev => new Set([...prev, result.prompt_name]))
      await loadVersions()
    }
    setCreating(false)
  }

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const handleApproveDraft = async (version: PromptVersionAPI) => {
    setActionLoadingId(version.id)
    try {
      const result = await safeApiCall(() =>
        updatePromptVersion(version.id, { status: 'testing' })
      )
      if (result) {
        toast.success(`Approved ${version.prompt_name} ${version.version} → testing`)
        await loadVersions()
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDiscardDraft = async (version: PromptVersionAPI) => {
    setActionLoadingId(version.id)
    try {
      const result = await safeApiCall(() => deletePromptVersion(version.id))
      if (result) {
        toast.success(`Discarded draft ${version.prompt_name} ${version.version}`)
        await loadVersions()
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'production': return 'bg-green-500'
      case 'testing': return 'bg-blue-500'
      case 'draft': return 'bg-yellow-500'
      case 'archived': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getPerformanceTrend = (vers: PromptVersionAPI[]) => {
    const withScores = vers.filter(v => v.avg_score != null && v.avg_score > 0)
    if (withScores.length < 2) return null
    const delta = (withScores[0].avg_score || 0) - (withScores[1].avg_score || 0)
    if (delta > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (delta < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return null
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-3 text-muted-foreground">Loading prompt versions...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={loadVersions}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    )
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
        <Button
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
          onClick={() => openCreateDialog(null)}
        >
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
            <div className="text-2xl font-bold">{stats.uniquePrompts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalVersions} total versions
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
            <div className="text-2xl font-bold">
              {stats.avgSuccessRate > 0 ? `${stats.avgSuccessRate.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Across versions with test data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Test Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTests}</div>
            <p className="text-xs text-muted-foreground">
              Across all versions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Score Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgScoreImprovement !== null
                ? `${stats.avgScoreImprovement > 0 ? '+' : ''}${stats.avgScoreImprovement.toFixed(1)}`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Latest vs previous version
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {promptGroups.length === 0 && (
        <Card className="p-12 text-center">
          <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No prompt versions yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first prompt to start testing
          </p>
          <Button onClick={() => openCreateDialog(null)}>
            <Plus className="w-4 h-4 mr-2" /> Create First Prompt
          </Button>
        </Card>
      )}

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
                      {group.versions.length} version{group.versions.length !== 1 ? 's' : ''} • Latest: {group.versions[0].version}
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
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-blue-500" />

                      {group.versions.map((version, idx) => (
                        <motion.div
                          key={version.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="relative"
                        >
                          <div
                            className={`absolute -left-5 top-8 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                              idx === 0 ? 'bg-purple-500' : 'bg-gray-400'
                            }`}
                          />

                          <Card
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedPrompt === version.id
                                ? 'border-purple-500 shadow-lg'
                                : version.status === 'draft'
                                ? 'border-dashed border-yellow-500/60'
                                : ''
                            }`}
                            onClick={() => setSelectedPrompt(version.id)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-semibold text-lg">{version.version}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Created {formatDate(version.created_at)}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  {version.total_test_runs || 0} tests
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Success Rate</p>
                                  <p className="text-lg font-bold">
                                    {version.avg_success_rate != null
                                      ? `${version.avg_success_rate}%`
                                      : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Avg Score</p>
                                  <p className="text-lg font-bold">
                                    {version.avg_score != null
                                      ? `${version.avg_score}/10`
                                      : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Last Updated</p>
                                  <p className="text-sm font-medium">
                                    {formatDate(version.updated_at || version.created_at)}
                                  </p>
                                </div>
                              </div>

                              {/* Performance Bar */}
                              {version.avg_score != null && (
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
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-4">
                                {version.status === 'draft' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                      disabled={actionLoadingId === version.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleApproveDraft(version)
                                      }}
                                    >
                                      {actionLoadingId === version.id ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4 mr-1" />
                                      )}
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                      disabled={actionLoadingId === version.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDiscardDraft(version)
                                      }}
                                    >
                                      {actionLoadingId === version.id ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4 mr-1" />
                                      )}
                                      Discard
                                    </Button>
                                  </>
                                ) : (
                                  <>
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
                                  </>
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
                        onClick={(e) => {
                          e.stopPropagation()
                          openCreateDialog(group.name)
                        }}
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {createForGroup ? `New Version: ${createForGroup}` : 'Create New Prompt'}
            </DialogTitle>
            <DialogDescription>
              {createForGroup
                ? `Add a new version to "${createForGroup}"`
                : 'Create a brand new prompt with its first version'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prompt-name">Prompt Name</Label>
              <Input
                id="prompt-name"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Medical Audit Assistant"
                disabled={!!createForGroup}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={formVersion}
                onChange={e => setFormVersion(e.target.value)}
                placeholder="e.g. v1.0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">System Prompt Content</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder="Enter the system prompt content..."
                rows={6}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="business-type">Business Type (optional)</Label>
              <Input
                id="business-type"
                value={formBusinessType}
                onChange={e => setFormBusinessType(e.target.value)}
                placeholder="e.g. healthcare, customer-service"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Optimization Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="What changed in this version..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Computes average score improvement (latest vs previous) across groups
 */
function computeAvgImprovement(groups: PromptGroup[]): number | null {
  const deltas: number[] = []

  for (const group of groups) {
    const withScores = group.versions.filter(v => v.avg_score != null && v.avg_score > 0)
    if (withScores.length >= 2) {
      deltas.push((withScores[0].avg_score || 0) - (withScores[1].avg_score || 0))
    }
  }

  if (deltas.length === 0) return null
  return deltas.reduce((sum, d) => sum + d, 0) / deltas.length
}
