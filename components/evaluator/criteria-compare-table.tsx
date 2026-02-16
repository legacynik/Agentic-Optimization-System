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
import { ArrowUp, ArrowDown, Minus } from "lucide-react"

interface CriteriaCompareTableProps {
  criteria: Array<{
    name: string
    a: number
    b: number
    delta: number
    direction: "up" | "down" | "same"
  }>
}

export function CriteriaCompareTable({ criteria }: CriteriaCompareTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criteria Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Criterion</TableHead>
              <TableHead className="text-center">Evaluation A</TableHead>
              <TableHead className="text-center">Delta</TableHead>
              <TableHead className="text-center">Evaluation B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criteria.map((criterion) => (
              <TableRow key={criterion.name}>
                <TableCell className="font-medium">
                  {criterion.name.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{criterion.a.toFixed(2)}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {getDeltaBadge(criterion.delta)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{criterion.b.toFixed(2)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
