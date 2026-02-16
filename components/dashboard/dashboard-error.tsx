import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardErrorProps {
  error: string
}

export function DashboardError({ error }: DashboardErrorProps) {
  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Database Setup Required</CardTitle>
        <CardDescription>
          The database schema needs to be initialized before using the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Run the database migration scripts in <code className="bg-muted px-1 py-0.5 rounded">supabase/migrations</code>
          to set up the required tables and views.
        </p>
        <p className="text-xs text-destructive">{error}</p>
      </CardContent>
    </Card>
  )
}
