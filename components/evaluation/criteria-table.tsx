"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { getScoreTextColor, getProgressColor } from "@/lib/score-utils"
import type { CriteriaComparisonItem } from "@/lib/criteria-comparison"

interface CriteriaTableProps {
  criteriaComparison: CriteriaComparisonItem[]
  humanNotes?: string
}

export function CriteriaTable({ criteriaComparison, humanNotes }: CriteriaTableProps) {
  const [sortBy, setSortBy] = useState<"name" | "score">("score")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const sortedCriteria = useMemo(() => {
    const sorted = [...criteriaComparison]
    sorted.sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      return sortOrder === "asc" ? a.score - b.score : b.score - a.score
    })
    return sorted
  }, [criteriaComparison, sortBy, sortOrder])

  const toggleSort = (column: "name" | "score") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const toggleRow = (criteriaName: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(criteriaName)) newExpanded.delete(criteriaName)
    else newExpanded.add(criteriaName)
    setExpandedRows(newExpanded)
  }

  return (
    <Card className="border-2 border-border bg-gradient-to-br from-card to-card/80 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
        <CardTitle className="text-xl font-black uppercase text-foreground">Criteria Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/30">
              <TableHead className="text-muted-foreground uppercase text-xs font-bold">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("name")} className="hover:text-primary">
                  Criterio
                  {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="text-muted-foreground uppercase text-xs font-bold text-center">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("score")} className="hover:text-primary">
                  Score
                  {sortBy === "score" && (sortOrder === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="text-muted-foreground uppercase text-xs font-bold text-center">vs Persona</TableHead>
              <TableHead className="text-muted-foreground uppercase text-xs font-bold text-center">vs Global</TableHead>
              <TableHead className="text-muted-foreground uppercase text-xs font-bold text-center">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCriteria.map((criteria) => {
              const diffPersona = criteria.score - criteria.personaAvg
              const diffGlobal = criteria.score - criteria.globalAvg
              const isExpanded = expandedRows.has(criteria.name)

              return (
                <>
                  <TableRow key={criteria.name} className="border-border hover:bg-muted/20 transition-colors">
                    <TableCell className="font-semibold text-foreground">{criteria.name}</TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <div className={`text-2xl font-bold ${getScoreTextColor(criteria.score)}`}>
                          {criteria.score.toFixed(1)}
                        </div>
                        <Progress value={criteria.score * 10} className={`h-2 bg-muted ${getProgressColor(criteria.score)}`} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <DiffIndicator diff={diffPersona} />
                    </TableCell>
                    <TableCell className="text-center">
                      <DiffIndicator diff={diffGlobal} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={criteria.score >= 8 ? "default" : criteria.score >= 6 ? "secondary" : "destructive"}
                        className="uppercase font-bold shadow-sm"
                      >
                        {criteria.score >= 8 ? "Excellent" : criteria.score >= 6 ? "Good" : "Poor"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => toggleRow(criteria.name)} className="hover:text-primary">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="border-border bg-gradient-to-r from-muted/20 to-muted/10">
                      <TableCell colSpan={6} className="p-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">Persona Average:</span> {criteria.personaAvg.toFixed(1)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">Global Average:</span> {criteria.globalAvg.toFixed(1)}
                          </p>
                          {humanNotes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              <span className="font-semibold text-foreground">Notes:</span> {humanNotes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function DiffIndicator({ diff }: { diff: number }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {diff > 0.5 ? (
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      ) : diff < -0.5 ? (
        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground" />
      )}
      <span
        className={
          diff > 0 ? "text-green-600 dark:text-green-400 font-semibold"
            : diff < 0 ? "text-red-600 dark:text-red-400 font-semibold"
              : "text-muted-foreground"
        }
      >
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}
      </span>
    </div>
  )
}
