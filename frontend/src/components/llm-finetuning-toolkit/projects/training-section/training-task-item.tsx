// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  MessageSquare,
  Download,
  Loader2,
  Clock,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  StopCircle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TaskActions } from "./task-actions";
import { TaskDetailTabs } from "./task-detail-tabs";
import { Task } from "@/hooks/llm-finetuning-toolkit/use-tasks";
import { usePrepareDeployment } from "@/hooks/llm-finetuning-toolkit/use-services";
import { toast } from "sonner";

// Utility functions that were previously imported from ./utils.tsx
const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "started":
    case "running":
      return <Play className="h-4 w-4 text-blue-500" />;
    case "paused":
    case "revoked":
      return <Pause className="h-4 w-4 text-amber-500" />;
    case "completed":
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
    case "failure":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "stopped":
      return <StopCircle className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "started":
    case "running":
      return "bg-blue-100 text-blue-800";
    case "paused":
    case "revoked":
      return "bg-amber-100 text-amber-800";
    case "completed":
    case "success":
      return "bg-green-100 text-green-800";
    case "failed":
    case "failure":
      return "bg-red-100 text-red-800";
    case "stopped":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getProgressColor = (status: string) => {
  switch (status) {
    case "started":
    case "running":
      return "bg-blue-500";
    case "paused":
    case "revoked":
      return "bg-amber-500";
    case "completed":
    case "success":
      return "bg-green-500";
    case "failed":
    case "failure":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

// Function to determine badge color based on stage
const getStageBadgeColor = (stage?: string) => {
  if (!stage) return "bg-gray-100 text-gray-800";

  if (stage.includes("Completed")) return "bg-green-100 text-green-800";
  if (stage.includes("Training")) return "bg-blue-100 text-blue-800";
  if (stage.includes("Error") || stage.includes("Failed"))
    return "bg-red-100 text-red-800";
  if (stage.includes("Evaluating")) return "bg-purple-100 text-purple-800";
  if (stage.includes("Preparing")) return "bg-yellow-100 text-yellow-800";

  return "bg-gray-100 text-gray-800";
};

interface TrainingTaskItemProps {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onResumeTask: (id: string) => void;
  onStopTask: (id: string) => void;
  onRestartTask: (id: string) => void;
  onEvaluateTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export function TrainingTaskItem({
  task,
  isExpanded,
  onToggleExpand,
  onResumeTask,
  onStopTask,
  onRestartTask,
  onEvaluateTask,
  onDeleteTask,
}: TrainingTaskItemProps) {
  const { mutateAsync: prepareDeployment } = usePrepareDeployment();
  const [isPreparing, setIsPreparing] = useState(false);

  const taskId = task.id.toString();
  const taskName = `Task ${task.id}`
  // Get model name from configs
  const modelName =
    task.configs?.model_args?.model_name_or_path;
  // Get hardware device from configs
  const hardware = task.configs?.model_args?.device || "Unknown";
  // Get status in lowercase for consistency
  const status = task.status.toLowerCase();
  // Get stage from results if available
  const stage = task.results?.stage;

  // Get download status and progress
  const downloadStatus = task.download_status || "NOT_STARTED";
  const downloadProgress = task.download_progress || 0;

  // Calculate progress from results
  let progress = 0;
  let currentStep = 0;
  let maxSteps = 0;

  // Extract the current step and max steps from the results
  if (task.results) {
    currentStep = Object.keys(task.results.train_history || {}).length
      ? Math.max(...Object.keys(task.results.train_history).map(Number))
      : 0;
    maxSteps = task.results.max_steps || 0;

    // Calculate progress as a percentage of current step vs max steps
    progress =
      maxSteps > 0
        ? Math.min(Math.round((currentStep / maxSteps) * 100), 100)
        : 0;

    // If the task is completed, set progress to 100%
    if (task.status === "SUCCESS") {
      progress = 100;
    }
  }

  // Get timestamp strings and convert to Date objects
  const createdAt = new Date(task.created_date || Date.now());
  const completedAt =
    task.status === "SUCCESS"
      ? new Date(task.modified_date || Date.now())
      : undefined;

  // Handle prepare deployment button click
  const handlePrepareDeployment = async () => {
    try {
      setIsPreparing(true);
      await prepareDeployment({ id: parseInt(taskId) });
      toast.success("Starting preparation of model for download");
    } catch (error) {
      console.error("Error preparing deployment:", error);
      toast.error("Failed to prepare model for download");
    } finally {
      setIsPreparing(false);
    }
  };

  // Handle download button click
  const handleDownload = () => {
    window.location.href = `/llm-finetuning-toolkit/api/download?id=${taskId}`;
  };

  // Render the download button based on download status
  const renderDownloadButton = () => {
    if (status !== "success") return null;

    if (downloadStatus === "NOT_STARTED") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrepareDeployment}
          disabled={isPreparing}
        >
          {isPreparing ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Preparing...
            </>
          ) : (
            <>
              <Download className="mr-1 h-3 w-3" /> Prepare Download
            </>
          )}
        </Button>
      );
    }

    if (downloadStatus === "STARTED") {
      return (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Preparing ({downloadProgress}%)
        </Button>
      );
    }

    if (downloadStatus === "FAILURE") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrepareDeployment}
          disabled={isPreparing}
        >
          <Download className="mr-1 h-3 w-3" /> Retry Preparation
        </Button>
      );
    }

    // SUCCESS state
    if (downloadStatus === "SUCCESS") {
      return (
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-1 h-3 w-3" /> Download
        </Button>
      );
    }

    return null;
  };

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={() => onToggleExpand(taskId)}
      className="border rounded-md bg-white overflow-hidden"
    >
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggleExpand(taskId)}
      >
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium">{taskName}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{modelName}</Badge>
              <Badge variant="outline">{hardware}</Badge>
              <Badge className={getStatusColor(status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(status)}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </Badge>
              {stage && status !== "failure" && (
                <Badge className={getStageBadgeColor(stage)}>{stage}</Badge>
              )}
              {status === "success" && task.results?.metrics?.accuracy !== undefined && (
                <Badge className="bg-blue-100 text-blue-800">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Accuracy: {(task.results.metrics.accuracy * 100).toFixed(1)}%
                  </span>
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {status === "success" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEvaluateTask(taskId)}
              >
                <MessageSquare className="mr-1 h-3 w-3" /> Evaluate
              </Button>
            )}
            {renderDownloadButton()}
            <TaskActions
              task={task}
              onResume={onResumeTask}
              onStop={onStopTask}
              onRestart={onRestartTask}
              onDelete={onDeleteTask}
            />
            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isExpanded ? "transform rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Display progress bar with current step/max steps information */}
        {status !== "success" && status !== "failure" && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress: {progress}%</span>
              {stage && <span>{stage}</span>}
            </div>
            <Progress
              value={progress}
              className="h-2"
              indicatorClassName={getProgressColor(status)}
            />
            {maxSteps > 0 && (
              <div className="text-xs text-gray-500">
                Step {currentStep}/{maxSteps}
              </div>
            )}
          </div>
        )}

        {/* Display download preparation progress if in progress */}
        {downloadStatus === "STARTED" && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Download Preparation: {downloadProgress}%</span>
            </div>
            <Progress
              value={downloadProgress}
              className="h-2"
              indicatorClassName="bg-yellow-500"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-gray-600">
          <div>
            <span className="font-medium">Created:</span>{" "}
            {createdAt.toLocaleString()}
          </div>
          {completedAt && (
            <div>
              <span className="font-medium">Completed:</span>{" "}
              {completedAt.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <CollapsibleContent>
        <div className="border-t p-4 bg-gray-50">
          <TaskDetailTabs task={task} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
