// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskMetricsTab } from "./task-metrics-tab";
import { TaskParametersTab } from "./task-parameters-tab";
import { Task } from "@/hooks/llm-finetuning-toolkit/use-tasks";

interface TaskDetailTabsProps {
  task: Task;
}

export function TaskDetailTabs({ task }: TaskDetailTabsProps) {
  return (
    <Tabs defaultValue="metrics">
      <TabsList>
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="parameters">Parameters</TabsTrigger>
      </TabsList>
      <TabsContent value="metrics" className="mt-4">
        <TaskMetricsTab task={task} />
      </TabsContent>
      <TabsContent value="parameters" className="mt-4">
        <TaskParametersTab task={task} />
      </TabsContent>
    </Tabs>
  );
}
