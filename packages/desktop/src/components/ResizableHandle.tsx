/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

"use client"

import type React from "react"

import { useRef } from "react"

interface ResizableHandleProps {
  onResize: (deltaX: number) => void
}

export function ResizableHandle({ onResize }: ResizableHandleProps) {
  const isDragging = useRef(false)
  const startX = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.clientX
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const deltaX = e.clientX - startX.current
      startX.current = e.clientX
      onResize(deltaX)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div
      className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors flex-shrink-0"
      onMouseDown={handleMouseDown}
    />
  )
}
