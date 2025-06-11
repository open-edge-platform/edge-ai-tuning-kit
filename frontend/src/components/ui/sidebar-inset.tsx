// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import type React from "react"
import { useSidebar } from "@/components/ui/sidebar"

interface SidebarInsetProps {
  children: React.ReactNode
}

export function SidebarInset({ children }: SidebarInsetProps) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return <div className={isCollapsed ? "" : "md:pl-64"}>{children}</div>
}

