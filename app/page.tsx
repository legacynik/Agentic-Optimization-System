import { Suspense } from "react"
import { DashboardContent } from "@/components/dashboard-content"

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
      {/* Charts Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-80 rounded-xl bg-muted/50 animate-pulse" />
        <div className="h-80 rounded-xl bg-muted/50 animate-pulse" />
      </div>
      {/* Table Skeleton */}
      <div className="h-96 rounded-xl bg-muted/50 animate-pulse" />
    </div>
  )
}
