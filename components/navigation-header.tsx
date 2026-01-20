'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Home,
  MessageSquare,
  TrendingUp,
  Zap,
  Brain,
  Settings,
  GitBranch
} from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function NavigationHeader() {
  const pathname = usePathname()

  const navigation = [
    {
      name: 'Prompts',
      href: '/prompts',
      icon: GitBranch,
      description: 'Version Control Center',
      highlight: true
    },
    {
      name: 'Test Launcher',
      href: '/test-launcher',
      icon: Zap,
      description: 'Launch N8N Tests',
      highlight: true
    },
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      description: 'Overview and metrics'
    },
    {
      name: 'Conversations',
      href: '/conversations',
      icon: MessageSquare,
      description: 'Explore conversations'
    },
    {
      name: 'Executive',
      href: '/executive',
      icon: TrendingUp,
      description: 'Executive view'
    },
    {
      name: 'Agentic Lab',
      href: '/agentic',
      icon: Zap,
      description: 'Battle testing system'
    }
  ]

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-600" />
              <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Testing System
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative px-3 py-2 text-sm font-medium transition-colors rounded-md',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-primary',
                      item.highlight && !isActive && 'hover:text-purple-600'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.name}
                      {item.highlight && !isActive && (
                        <span className="absolute -top-1 -right-1">
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                          </span>
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}