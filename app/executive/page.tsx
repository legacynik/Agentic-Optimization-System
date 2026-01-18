import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ExecutiveDashboard } from "@/components/executive-dashboard"
import { ArrowLeft } from "lucide-react"

export default function ExecutivePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Executive Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Suspense fallback={<div className="text-muted-foreground">Loading executive dashboard...</div>}>
          <ExecutiveDashboard />
        </Suspense>
      </main>
    </div>
  )
}
