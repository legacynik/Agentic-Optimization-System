import type React from "react"
import type { Metadata } from "next"
import { Teko, Inter, Roboto_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { Providers } from "@/components/providers"

const teko = Teko({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-teko",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
})

export const metadata: Metadata = {
  title: "AI Agent Dashboard - Doom 64 Edition",
  description: "Conversation explorer with Doom 64 aesthetic",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${teko.variable} ${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
