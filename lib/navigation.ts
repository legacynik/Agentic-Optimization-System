import {
  LayoutDashboard,
  Rocket,
  MessageSquare,
  ListChecks,
  Settings,
  FileText,
  Users,
  ClipboardCheck,
  Activity,
} from "lucide-react"

export const NAV_DASHBOARD = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
] as const

export const NAV_TESTING = [
  { title: "Test Launcher", url: "/test-launcher", icon: Rocket },
  { title: "Test Runs", url: "/test-runs", icon: ListChecks },
  { title: "Conversations", url: "/conversations", icon: MessageSquare },
] as const

export const NAV_CONFIG = [
  { title: "Prompts", url: "/prompts", icon: FileText },
  { title: "Evaluators", url: "/evaluators", icon: ClipboardCheck },
  { title: "Personas", url: "/personas", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
] as const

export const NAV_INTELLIGENCE = [
  { title: "Agent Health", url: "/agentic", icon: Activity },
] as const
