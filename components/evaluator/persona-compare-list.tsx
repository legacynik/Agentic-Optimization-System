import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus } from "lucide-react"

interface PersonaCompareListProps {
  personas: Array<{
    persona_id: string
    persona_name: string
    score_a: number
    score_b: number
    delta: number
    criteria_deltas: Array<{
      name: string
      a: number
      b: number
      delta: number
    }>
  }>
}

export function PersonaCompareList({ personas }: PersonaCompareListProps) {
  const [expandedPersonas, setExpandedPersonas] = useState<Set<string>>(new Set())

  const togglePersona = (personaId: string) => {
    setExpandedPersonas((prev) => {
      const next = new Set(prev)
      if (next.has(personaId)) {
        next.delete(personaId)
      } else {
        next.add(personaId)
      }
      return next
    })
  }

  return (
    <div className="space-y-2">
      {personas.map((persona) => (
        <Card key={persona.persona_id}>
          <Collapsible
            open={expandedPersonas.has(persona.persona_id)}
            onOpenChange={() => togglePersona(persona.persona_id)}
          >
            <CardHeader className="cursor-pointer">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">
                    {persona.persona_name}
                  </CardTitle>
                  {getDeltaBadge(persona.delta)}
                </div>
                {expandedPersonas.has(persona.persona_id) ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criterion</TableHead>
                      <TableHead className="text-center">Eval A</TableHead>
                      <TableHead className="text-center">Delta</TableHead>
                      <TableHead className="text-center">Eval B</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {persona.criteria_deltas.map((criterion) => (
                      <TableRow key={criterion.name}>
                        <TableCell className="text-sm">
                          {criterion.name.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {criterion.a.toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getDeltaBadge(criterion.delta)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {criterion.b.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  )
}

function getDeltaBadge(delta: number) {
  const formatted = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)

  if (Math.abs(delta) < 0.01) {
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="h-3 w-3" />
        {formatted}
      </Badge>
    )
  }

  if (delta > 0) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <ArrowUp className="h-3 w-3" />
        {formatted}
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <ArrowDown className="h-3 w-3" />
      {formatted}
    </Badge>
  )
}
