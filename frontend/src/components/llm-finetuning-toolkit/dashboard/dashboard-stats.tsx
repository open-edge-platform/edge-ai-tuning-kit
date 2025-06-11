// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Brain } from "lucide-react";
import { Model } from "@/hooks/llm-finetuning-toolkit/use-models";
import { Project } from "@/hooks/llm-finetuning-toolkit/use-projects";

interface DashboardStatsProps {
  projects?: Project[];
  models?: Model[];
}

export function DashboardStats({
  projects = [],
  models = [],
}: DashboardStatsProps) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {projects ? (
            <div className="text-2xl font-bold">{projects.length}</div>
          ) : (
            <div className="animate-pulse rounded-md bg-gray-200 h-6 w-1/4" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Models</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{models.length}</div>
        </CardContent>
      </Card>
    </>
  );
}
