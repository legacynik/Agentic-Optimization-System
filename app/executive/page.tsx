import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export default function ExecutivePage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Executive Dashboard</h1>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            This page is being rewritten for the new schema. Coming in Phase 4.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Go to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
