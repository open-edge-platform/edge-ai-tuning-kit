// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, StopCircle, RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Task } from "@/hooks/llm-finetuning-toolkit/use-tasks";

interface TaskActionsProps {
  task: Task;
  onResume: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskActions({
  task,
  onResume,
  onStop,
  onRestart,
  onDelete,
}: TaskActionsProps) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleDelete = () => {
    onDelete(task.id.toString());
    setShowDeleteConfirmation(false);
  };

  // Get status in lowercase for consistency
  const status = task.status.toLowerCase();

  // Determine if delete should be disabled (when task is running)
  const isDeleteDisabled = status === "started" || status === "pending";

  return (
    <div className="flex gap-2">
      {(status === "started" || status === "pending") && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onStop(task.id.toString())}
        >
          <StopCircle className="mr-1 h-3 w-3" /> Stop
        </Button>
      )}
      {status === "paused" && (
        <Button
          variant="default"
          size="sm"
          onClick={() => onResume(task.id.toString())}
        >
          <Play className="mr-1 h-3 w-3" /> Resume
        </Button>
      )}
      {status === "failure" && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRestart(task.id.toString())}
        >
          <RefreshCw className="mr-1 h-3 w-3" /> Restart
        </Button>
      )}

      <Button
        variant={isDeleteDisabled ? "outline" : "destructive"}
        size="sm"
        className={isDeleteDisabled ? "opacity-50 cursor-not-allowed" : ""}
        onClick={() => !isDeleteDisabled && setShowDeleteConfirmation(true)}
        disabled={isDeleteDisabled}
        title={
          isDeleteDisabled ? "Cannot delete a running task" : "Delete this task"
        }
      >
        <Trash2 className="mr-1 h-3 w-3" /> Delete
      </Button>

      <AlertDialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this training task? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
