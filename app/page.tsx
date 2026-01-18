import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardOverview } from "@/components/dashboard-overview"
import { ArrowRight, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">AI Agent Testing Dashboard</h1>
          <div className="flex gap-2">
            <Link href="/executive">
              <Button variant="outline" className="gap-2 bg-transparent">
                <BarChart3 className="h-4 w-4" />
                Executive
              </Button>
            </Link>
            <Link href="/conversations">
              <Button variant="outline" className="gap-2 bg-transparent">
                Conversation Explorer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Suspense fallback={<div className="text-muted-foreground">Loading dashboard...</div>}>
          <DashboardOverview />
        </Suspense>
      </main>
    </div>
  )
}
