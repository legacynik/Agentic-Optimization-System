import {
  LayoutDashboard,
  MessageSquare,
  Rocket,
  Settings,
  Bot,
  FileText,
  BarChart3,
  Users,
  ClipboardCheck,
} from "lucide-react"

export const NAV_MAIN = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Conversations", url: "/conversations", icon: MessageSquare },
  { title: "Executive", url: "/executive", icon: BarChart3 },
] as const

export const NAV_TESTING = [
  { title: "Test Launcher", url: "/test-launcher", icon: Rocket },
  { title: "Agentic Testing", url: "/agentic", icon: Bot },
] as const

export const NAV_CONFIG = [
  { title: "Personas", url: "/personas", icon: Users },
  { title: "Prompts", url: "/prompts", icon: FileText },
  { title: "Evaluators", url: "/evaluators", icon: ClipboardCheck },
  { title: "Settings", url: "/settings", icon: Settings },
] as const
