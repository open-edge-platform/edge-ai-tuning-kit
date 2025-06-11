// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/llm-finetuning-toolkit/sidebar/sidebar"
import { LayoutContent } from "@/components/layout-content"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}

