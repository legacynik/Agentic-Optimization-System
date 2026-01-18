import { ConversationExplorer } from "@/components/conversation-explorer"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ConversationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Conversation Explorer</h1>
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-73px)]">
        <ConversationExplorer />
      </main>
    </div>
  )
}
