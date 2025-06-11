// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ResizableTableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
}

export function ResizableTable({ children, className, ...props }: ResizableTableProps) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  )
}

interface ResizableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
  width?: string
  minWidth?: string
}

export function ResizableHeader({
  children,
  className,
  width = "auto",
  minWidth = "100px",
  ...props
}: ResizableHeaderProps) {
  const [columnWidth, setColumnWidth] = useState(width)
  const headerRef = useRef<HTMLTableCellElement>(null)
  const resizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    resizingRef.current = true
    startXRef.current = e.clientX
    if (headerRef.current) {
      startWidthRef.current = headerRef.current.offsetWidth
    }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return
    const deltaX = e.clientX - startXRef.current
    const newWidth = Math.max(Number.parseInt(minWidth), startWidthRef.current + deltaX)
    setColumnWidth(`${newWidth}px`)
  }

  const handleMouseUp = () => {
    resizingRef.current = false
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  return (
    <th
      ref={headerRef}
      className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground relative", className)}
      style={{ width: columnWidth, minWidth }}
      {...props}
    >
      <div className="flex items-center justify-between">{children}</div>
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100 hover:bg-primary/50"
        onMouseDown={handleMouseDown}
      />
    </th>
  )
}

export function ResizableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("p-1.5 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props}>
      {children}
    </td>
  )
}

