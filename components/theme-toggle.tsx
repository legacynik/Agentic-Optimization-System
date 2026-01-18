"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const root = document.documentElement
    const currentTheme = root.classList.contains("light") ? "light" : "dark"
    setTheme(currentTheme)
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    const newTheme = theme === "dark" ? "light" : "dark"

    root.classList.remove("dark", "light")
    root.classList.add(newTheme)
    setTheme(newTheme)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="border-2 border-primary hover:bg-primary/20 transition-all bg-transparent"
    >
      {theme === "dark" ? <Sun className="h-5 w-5 text-accent" /> : <Moon className="h-5 w-5 text-primary" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
