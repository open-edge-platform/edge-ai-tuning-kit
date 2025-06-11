// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateTaskDialog } from "./create-task-dialog";
import { TrainingTaskItem } from "./training-task-item";
import { ModelEvaluation } from "./evaluation/model-evaluation";
import type { CreateTaskProps } from "./types";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useRestartTask,
} from "@/hooks/llm-finetuning-toolkit/use-tasks";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useModels } from "@/hooks/llm-finetuning-toolkit/use-models";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAckDatasetDataCount } from "@/hooks/llm-finetuning-toolkit/use-datasets";

export function TrainingSection({ projectId }: { projectId: string }) {
  const {
    data: tasks = [],
    isLoading,
    error,
  } = useTasks({ project_id: parseInt(projectId) }, 5000);
  const { data: unsortedModels = [] } = useModels();
  const models = useMemo(
    () =>
      [...unsortedModels].sort((a, b) => a.model_id.localeCompare(b.model_id)),
    [unsortedModels]
  );
  const { mutateAsync: createTask } = useCreateTask();
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();
  const { mutateAsync: restartTask } = useRestartTask();
  const { data: datasetDataCount = 0, isLoading: isDatasetCountLoading } =
    useAckDatasetDataCount(parseInt(projectId));

  const router = useRouter();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState("active");

  // Define supported devices
  const supportedDevice = [{ name: "xpu", label: "Intel GPU" }];

  // Default task configuration function to ensure consistency
  const getDefaultTaskConfig = () => {
    const defaultTaskType = "QLORA";
    // Ensure num_gpus is always "1" for QLORA
    const defaultNumGpus = defaultTaskType === "QLORA" ? "1" : "1";

    return {
      project_id: parseInt(projectId),
      dataset_id: parseInt(projectId),
      task_type: defaultTaskType,
      num_gpus: defaultNumGpus,
      model_path: models[0]?.model_id,
      device: supportedDevice[0].name,
      max_length: "2048",
      per_device_train_batch_size: "1",
      per_device_eval_batch_size: "1",
      gradient_accumulation_steps: "1",
      learning_rate: "0.0001",
      num_train_epochs: "3",
      lr_scheduler_type: "cosine",
      optim: "adamw_torch",
      enabled_synthetic_generation: true,
    };
  };

  const [taskConfigs, setTaskConfigs] = useState<CreateTaskProps>(
    getDefaultTaskConfig()
  );

  // Update model_path when models are loaded
  useEffect(() => {
    if (models.length > 0 && !taskConfigs.model_path) {
      setTaskConfigs((prev) => ({
        ...prev,
        model_path: models[0]?.model_id || "mistralai/Mistral-7B-Instruct-v0.3",
      }));
    }
  }, [models, taskConfigs.model_path]);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [evaluatingTaskId, setEvaluatingTaskId] = useState<string | null>(null);

  // Filter tasks based on active tab
  const filteredTasks = useMemo(() => {
    // Create a copy of tasks and sort by ID in ascending order
    const sortedTasks = [...tasks].sort((a, b) => a.id - b.id);

    if (activeTab === "active") {
      return sortedTasks.filter(
        (task) =>
          task.status === "PENDING" ||
          task.status === "STARTED" ||
          task.status === "RETRY"
      );
    }
    return sortedTasks;
  }, [tasks, activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTaskConfigs({
      ...taskConfigs,
      [name]: value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    // If changing to QLORA, ensure num_gpus is set to "1"
    if (name === "task_type" && value === "QLORA") {
      setTaskConfigs({
        ...taskConfigs,
        [name]: value,
        num_gpus: "1",
      });
    } else {
      setTaskConfigs({
        ...taskConfigs,
        [name]: value,
      });
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setTaskConfigs({
      ...taskConfigs,
      [name]: checked,
    });
  };

  const handleCreateTask = async () => {
    if (!taskConfigs.model_path) {
      toast.error("Model path is required.");
      return;
    }

    try {
      const result = await createTask(taskConfigs);
      setIsCreateTaskOpen(false);
      setTaskConfigs(getDefaultTaskConfig());
      if (result.status) {
        toast.success(
          "Your training task has been created and added to the queue."
        );
      } else {
        toast.error(`Failed to create training task. Error: ${result?.message}`);
      }
    } catch (err) {
      console.error("Error creating task:", err);
      toast.error("Failed to create training task.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(parseInt(id));
      toast.success("Training task deleted successfully.");
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete training task.");
    }
  };

  const handleResumeTask = async (id: string) => {
    try {
      await restartTask(parseInt(id));
      toast.success("Training task resumed.");
    } catch (err) {
      console.error("Error resuming task:", err);
      toast.error("Failed to resume training task.");
    }
  };

  const handleStopTask = async (id: string) => {
    try {
      await updateTask({
        id: parseInt(id),
        data: { status: "REVOKED" },
      });
      toast.success("Training task stopped.");
    } catch (err) {
      console.error("Error stopping task:", err);
      toast.error("Failed to stop training task.");
    }
  };

  const handleRestartTask = async (id: string) => {
    try {
      await restartTask(parseInt(id));
      toast.success("Training task restarted from the beginning.");
    } catch (err) {
      console.error("Error restarting task:", err);
      toast.error("Failed to restart training task.");
    }
  };

  const handleEvaluateTask = (id: string) => {
    // Find the task to get its model ID for the evaluation URL
    const task = tasks.find((t) => t.id.toString() === id);
    if (task && task.id) {
      // Use Next.js router.push for client-side navigation
      router.push(
        `/llm-finetuning-toolkit/projects/${projectId}/training/${task.id}/evaluation`
      );
    } else {
      toast.error("Unable to evaluate task. Model ID not found.");
    }
  };

  const handleCloseEvaluation = () => {
    setEvaluatingTaskId(null);
  };

  const toggleTaskExpansion = (id: string) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  const evaluatingTask = evaluatingTaskId
    ? tasks.find((task) => task.id.toString() === evaluatingTaskId)
    : null;

  if (evaluatingTask) {
    return (
      <ModelEvaluation
        task={{
          ...evaluatingTask,
        }}
        onClose={handleCloseEvaluation}
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading tasks ...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-500">
            <p>Error loading tasks data. Please try refreshing the page.</p>
            <p className="text-sm mt-2 text-gray-500">
              {(error as Error).message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate pagination values
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const indexOfLastTask = currentPage * itemsPerPage;
  const indexOfFirstTask = indexOfLastTask - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);

  // Handle page changes
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Training Tasks</CardTitle>
          <CardDescription>Manage your model training tasks</CardDescription>
        </div>
        <div className="flex gap-2">
          <CreateTaskDialog
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            formData={taskConfigs}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onCheckboxChange={handleCheckboxChange}
            onCreateTask={handleCreateTask}
            supportedDevice={supportedDevice}
            models={models}
            disabled={isDatasetCountLoading || datasetDataCount < 5}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="active"
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-[400px] grid-cols-2 mb-4">
            <TabsTrigger value="active">Active Tasks</TabsTrigger>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="w-full">
            <div className="space-y-4">
              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500 border rounded-md">
                  {isDatasetCountLoading || datasetDataCount < 5 ? (
                    <>
                      <p>No active training tasks found.</p>
                      <p className="mt-2 text-amber-600 font-medium">
                        ⚠️ You need at least 5 verified data samples to start training (current: {datasetDataCount}).
                      </p>
                    </>
                  ) : (
                    <>
                      No active training tasks found. Click Create Training Task to
                      start your first training job.
                    </>
                  )}
                </div>
              )}
              {currentTasks.map((task) => (
                <TrainingTaskItem
                  key={task.id}
                  task={task}
                  isExpanded={expandedTaskId === task.id.toString()}
                  onToggleExpand={toggleTaskExpansion}
                  onResumeTask={handleResumeTask}
                  onStopTask={handleStopTask}
                  onRestartTask={handleRestartTask}
                  onEvaluateTask={handleEvaluateTask}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="all" className="w-full">
            <div className="space-y-4">
              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500 border rounded-md">
                  {isDatasetCountLoading || datasetDataCount < 5 ? (
                    <>
                      <p>No training tasks found.</p>
                      <p className="mt-2 text-amber-600 font-medium">
                        ⚠️ You need at least 5 verified data samples to start training (current: {datasetDataCount}).
                      </p>
                    </>
                  ) : (
                    <>
                      No training tasks found. Click Create Training Task to start
                      your first training job.
                    </>
                  )}
                </div>
              )}
              {currentTasks.map((task) => (
                <TrainingTaskItem
                  key={task.id}
                  task={task}
                  isExpanded={expandedTaskId === task.id.toString()}
                  onToggleExpand={toggleTaskExpansion}
                  onResumeTask={handleResumeTask}
                  onStopTask={handleStopTask}
                  onRestartTask={handleRestartTask}
                  onEvaluateTask={handleEvaluateTask}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Improved pagination UI */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {filteredTasks.length > 0 ? indexOfFirstTask + 1 : 0}-
              {Math.min(indexOfLastTask, filteredTasks.length)} of{" "}
              {filteredTasks.length} tasks
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="default"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(1)}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-2" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center justify-center">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                // Logic to show pages around current page
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "default"}
                    size="sm"
                    className={`h-8 w-8 p-0 mx-0.5 ${
                      currentPage === pageNum ? "" : "opacity-70"
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    <span className="sr-only">Go to page {pageNum}</span>
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="default"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(totalPages)}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
