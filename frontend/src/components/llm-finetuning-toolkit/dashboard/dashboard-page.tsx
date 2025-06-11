// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { DashboardHeader } from "@/components/llm-finetuning-toolkit/dashboard/dashboard-header";
import { DashboardStats } from "@/components/llm-finetuning-toolkit/dashboard/dashboard-stats";
import { RecentProjects } from "@/components/llm-finetuning-toolkit/projects/recent-projects";
import { RecentModels } from "@/components/llm-finetuning-toolkit/models/recent-models";
import { useProjects } from "@/hooks/llm-finetuning-toolkit/use-projects";
import { useModels } from "@/hooks/llm-finetuning-toolkit/use-models";
import { HardwareInfoCard } from "@/components/common/hardware-info";

export function DashboardPage() {
  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjects();
  const {
    data: models,
    isLoading: modelsLoading,
    error: modelsError,
  } = useModels();

  return (
    <>
      <DashboardHeader
        heading="Dashboard"
        text="Overview of your LLM fine-tuning activities"
      />

      {/* Hardware Info Section */}
      <div className="w-full mt-6 mb-6">
        <HardwareInfoCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <DashboardStats projects={projects} models={models} />
      </div>

      {/* Recent Projects and Models */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-6">
        <RecentProjects
          limit={5}
          projects={projects}
          isLoading={projectsLoading}
          error={projectsError}
        />
        <RecentModels
          limit={5}
          models={models}
          isLoading={modelsLoading}
          error={modelsError}
        />
      </div>
    </>
  );
}
