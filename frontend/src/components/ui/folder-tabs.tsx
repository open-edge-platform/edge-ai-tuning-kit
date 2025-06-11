// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface FolderTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

interface FolderTabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const FolderTabsContext = React.createContext<FolderTabsContextValue | undefined>(undefined)

function useFolderTabsContext() {
  const context = React.useContext(FolderTabsContext)
  if (!context) {
    throw new Error("useFolderTabsContext must be used within a FolderTabs component")
  }
  return context
}

export function FolderTabs({ defaultValue, value, onValueChange, children, className, ...props }: FolderTabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")

  const contextValue = React.useMemo(
    () => ({
      value: value !== undefined ? value : internalValue,
      onValueChange: (newValue: string) => {
        setInternalValue(newValue)
        onValueChange?.(newValue)
      },
    }),
    [value, internalValue, onValueChange],
  )

  return (
    <FolderTabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </FolderTabsContext.Provider>
  )
}

export function FolderTabsList({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-row items-end border-b border-border bg-background", className)} {...props}>
      {children}
    </div>
  )
}

interface FolderTabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function FolderTabsTrigger({ className, value, children, ...props }: FolderTabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useFolderTabsContext()
  const isActive = selectedValue === value

  return (
    <button
      className={cn(
        "relative px-4 py-2 text-sm font-medium transition-all",
        "rounded-t-lg border-l border-t border-r border-border",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-background text-foreground z-10 border-b-0"
          : "bg-muted text-muted-foreground hover:bg-muted/80 -mb-px",
        isActive && "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-background",
        className,
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

interface FolderTabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function FolderTabsContent({ className, value, children, ...props }: FolderTabsContentProps) {
  const { value: selectedValue } = useFolderTabsContext()
  const isActive = selectedValue === value

  if (!isActive) return null

  return (
    <div
      className={cn("rounded-b-lg rounded-tr-lg border-b border-l border-r border-border bg-background p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

