// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ModelEvaluation } from "@/components/llm-finetuning-toolkit/projects/training-section/evaluation/model-evaluation";
import { useTasks } from "@/hooks/llm-finetuning-toolkit/use-tasks";
import { Loader2 } from "lucide-react";
import { Task } from "@/hooks/llm-finetuning-toolkit/use-tasks";

/**
 * Model Evaluation Page for specific model/task
 */
export default function ModelEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const modelId = params.modelId as string;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get tasks for this project
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks({ project_id: parseInt(projectId) }, 5000);

  useEffect(() => {
    if (!tasksLoading && tasks.length > 0) {
      // Find the task that matches the model_id from the URL
      // The model_id in a task might be in various formats, so we check if it contains our modelId
      const foundTask = tasks.find(
        (t) => t.id && String(t.id).includes(modelId)
      );

      if (foundTask) {
        setTask(foundTask);
      } else {
        setError(`No task found for model ID: ${modelId}`);
      }
      setLoading(false);
    } else if (tasksError) {
      setError("Failed to load tasks. Please try again later.");
      setLoading(false);
    }
  }, [tasks, tasksLoading, tasksError, modelId]);

  // Handle navigation back to the project page
  const handleClose = () => {
    router.push(`/llm-finetuning-toolkit/projects/${projectId}/training`);
  };

  if (loading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading model evaluation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Return to Project
        </button>
      </div>
    );
  }

  return (
    <div>
      {task ? (
        <ModelEvaluation task={task} onClose={handleClose} />
      ) : (
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="text-red-500 mb-4">
            Failed to load task data for evaluation.
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Return to Project
          </button>
        </div>
      )}
    </div>
  );
}
