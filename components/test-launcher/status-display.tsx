import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Square,
  XCircle,
  Eye,
} from "lucide-react"
import type { TestRunStatus } from "@/hooks/use-test-run-status"

interface StatusDisplayProps {
  status: TestRunStatus
  testRunCode: string
}

export function StatusDisplay({ status, testRunCode }: StatusDisplayProps) {
  const config = getStatusConfig(status)

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {config.icon}
        <CardTitle className="text-base">
          {status === "running" ? "Test in Progress" : `Test Run: ${testRunCode}`}
        </CardTitle>
      </div>
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    </div>
  )
}

function getStatusConfig(status: TestRunStatus): {
  icon: React.ReactNode
  variant: "default" | "secondary" | "destructive" | "outline"
  label: string
} {
  switch (status) {
    case "pending":
      return {
        icon: <Clock className="h-4 w-4 text-muted-foreground" />,
        variant: "outline",
        label: "PENDING",
      }
    case "running":
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
        variant: "secondary",
        label: "RUNNING",
      }
    case "battles_completed":
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-cyan-500" />,
        variant: "secondary",
        label: "BATTLES DONE",
      }
    case "evaluating":
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-purple-500" />,
        variant: "secondary",
        label: "EVALUATING",
      }
    case "completed":
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        variant: "default",
        label: "COMPLETED",
      }
    case "failed":
      return {
        icon: <XCircle className="h-4 w-4 text-destructive" />,
        variant: "destructive",
        label: "FAILED",
      }
    case "aborted":
      return {
        icon: <Square className="h-4 w-4 text-orange-500" />,
        variant: "destructive",
        label: "ABORTED",
      }
    case "awaiting_review":
      return {
        icon: <Eye className="h-4 w-4 text-yellow-500" />,
        variant: "secondary",
        label: "AWAITING REVIEW",
      }
    default:
      return {
        icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
        variant: "outline",
        label: "UNKNOWN",
      }
  }
}
