import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function EmptyState() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your AI agent testing performance
          </p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>No Test Data Yet</CardTitle>
          <CardDescription>
            Run your first test to see performance metrics here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Get started by:
          </p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
            <li>Go to <strong>Test Launcher</strong> to configure and run tests</li>
            <li>Create or import <strong>Personas</strong> to test against</li>
            <li>Configure <strong>Settings</strong> with your n8n webhook URLs</li>
          </ol>
          <div className="flex gap-2 pt-4">
            <a href="/test-launcher" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Launch Test
            </a>
            <a href="/settings" className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent">
              Configure Settings
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
