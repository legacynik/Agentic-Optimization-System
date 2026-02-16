"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Star, StarOff } from "lucide-react"
import { EvaluatorConfigForm } from "@/components/evaluator-config-form"

interface EvaluatorConfig {
  id: string
  name: string
  version: string
  description: string | null
  prompt_version_id: string
  prompt_name?: string
  criteria: Array<{
    name: string
    weight: number
    description: string
    scoring_guide?: string
  }>
  status: "draft" | "active" | "deprecated"
  is_promoted: boolean
  created_at: string
  updated_at: string
}

export default function EvaluatorsPage() {
  const [configs, setConfigs] = useState<EvaluatorConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConfig, setSelectedConfig] = useState<EvaluatorConfig | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterPromptId, setFilterPromptId] = useState<string | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [filterPromptId])

  async function fetchConfigs() {
    try {
      setLoading(true)
      const url = filterPromptId
        ? `/api/evaluator-configs?prompt_version_id=${filterPromptId}`
        : "/api/evaluator-configs"

      const response = await fetch(url)
      const result = await response.json()

      if (result.error) {
        console.error("Error fetching configs:", result.error)
        return
      }

      setConfigs(result.data || [])
    } catch (error) {
      console.error("Failed to fetch configs:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handlePromote(id: string) {
    try {
      const response = await fetch(`/api/evaluator-configs/${id}/promote`, {
        method: "POST",
      })
      const result = await response.json()

      if (result.error) {
        console.error("Error promoting config:", result.error)
        return
      }

      // Refresh configs
      fetchConfigs()
    } catch (error) {
      console.error("Failed to promote config:", error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to deprecate this evaluator config?")) {
      return
    }

    try {
      const response = await fetch(`/api/evaluator-configs/${id}`, {
        method: "DELETE",
      })
      const result = await response.json()

      if (result.error) {
        console.error("Error deleting config:", result.error)
        return
      }

      // Refresh configs
      fetchConfigs()
    } catch (error) {
      console.error("Failed to delete config:", error)
    }
  }

  function handleEdit(config: EvaluatorConfig) {
    setSelectedConfig(config)
    setIsDialogOpen(true)
  }

  function handleCreateNew() {
    setSelectedConfig(null)
    setIsDialogOpen(true)
  }

  function handleFormSuccess() {
    setIsDialogOpen(false)
    setSelectedConfig(null)
    fetchConfigs()
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      draft: "secondary",
      active: "default",
      deprecated: "destructive",
    }
    return <Badge variant={variants[status] || "default"}>{status}</Badge>
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluator Configs</h1>
          <p className="text-muted-foreground">
            Manage evaluator configurations and criteria for different prompts
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              New Config
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedConfig ? "Edit Evaluator Config" : "Create Evaluator Config"}
              </DialogTitle>
              <DialogDescription>
                Define evaluation criteria and system prompt template for this evaluator.
              </DialogDescription>
            </DialogHeader>
            <EvaluatorConfigForm
              config={selectedConfig}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluator Configurations</CardTitle>
          <CardDescription>
            {configs.length} configuration{configs.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading configs...
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No evaluator configs found. Create your first one!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Promoted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>{config.version}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {config.prompt_name || config.prompt_version_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{config.criteria.length} criteria</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(config.status)}</TableCell>
                    <TableCell>
                      {config.is_promoted ? (
                        <Badge variant="default">
                          <Star className="mr-1 h-3 w-3" />
                          Default
                        </Badge>
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {!config.is_promoted && config.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromote(config.id)}
                            title="Promote as default"
                          >
                            <StarOff className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                          title="Deprecate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
