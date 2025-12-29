"use client"

import type React from "react"

import { useEffect } from "react"

interface ThemeProviderProps {
  theme: "light" | "dark"
  children: React.ReactNode
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  return <>{children}</>
}
