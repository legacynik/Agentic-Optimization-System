import type React from "react"
import type { Metadata } from "next"
import { DM_Sans, Space_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { Providers } from "@/components/providers"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
})

export const metadata: Metadata = {
  title: "AI Agent Testing Dashboard",
  description: "Analytics dashboard for AI agent conversation testing",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="flex-1 overflow-auto">
                <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
                  {children}
                </Suspense>
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
