// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import type React from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const pathname = usePathname();

  // Only show navbar on specific project pages
  const isProjectPage =
    pathname.startsWith("/projects/") && pathname.split("/").length === 3;

  return (
    <SidebarInset>
      <div className="flex flex-col min-h-screen">
        {
          isProjectPage
        }
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isCollapsed
              ? "px-4 pt-4 md:px-20 md:pt-6 lg:px-24 lg:pt-6"
              : "p-4 md:p-6"
          }`}
        >
          {children}
        </main>
      </div>
    </SidebarInset>
  );
}
