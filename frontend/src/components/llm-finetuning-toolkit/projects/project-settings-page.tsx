// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SystemMessageSection } from "@/components/llm-finetuning-toolkit/projects/system-message-section";
import { DocumentUploadSection } from "@/components/llm-finetuning-toolkit/projects/document-section";
import { DatasetPreviewSection } from "@/components/llm-finetuning-toolkit/projects/dataset-section";
import { TrainingSection } from "@/components/llm-finetuning-toolkit/projects/training-section";
import {
  useProject,
  useDeleteProject,
} from "@/hooks/llm-finetuning-toolkit/use-projects";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, Loader2, FileQuestion } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Loading state placeholder
function LoadingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Loading project details...
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
        Please wait while we retrieve your project information.
      </p>
    </div>
  );
}

// Error state placeholder
function ErrorPlaceholder({ message }: { message: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
      <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Error loading project
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
        {message ||
          "There was a problem retrieving the project details. Please try again."}
      </p>
      <Button
        variant="outline"
        onClick={() => router.push("/llm-finetuning-toolkit/projects")}
        className="mt-2"
      >
        Return to Projects
      </Button>
    </div>
  );
}

// Not found placeholder
function NotFoundPlaceholder() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <FileQuestion className="h-10 w-10 text-gray-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Project not found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
        The project you are looking for does not exist or may have been deleted.
      </p>
      <Button
        variant="default"
        onClick={() => router.push("/llm-finetuning-toolkit/projects")}
        className="mt-2"
      >
        Return to Projects
      </Button>
    </div>
  );
}

export function ProjectSettingsPage({
  projectId,
  section,
}: {
  projectId: string;
  section: string;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Convert projectId to number for API calls
  const projectIdNum = parseInt(projectId, 10);

  // Fetch project data using the hook
  const { data: project, isLoading, error } = useProject(projectIdNum);

  // Initialize delete mutation
  const deleteProjectMutation = useDeleteProject();

  // Handle loading and error states with the new placeholder components
  if (isLoading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder message={error.message} />;
  if (!project) return <NotFoundPlaceholder />;

  const confirmDeleteProject = () => {
    deleteProjectMutation.mutate(projectIdNum, {
      onSuccess: () => {
        toast.success(
          `Project "${project.name}" has been deleted successfully.`
        );
        router.push("/llm-finetuning-toolkit/projects");
      },
      onError: (error) => {
        toast.error(`Failed to delete project: ${error.message}`);
      },
    });
  };

  // Render the appropriate section based on the URL
  const renderSection = () => {
    switch (section) {
      case "system-message":
        return <SystemMessageSection projectId={projectId} />;
      case "document":
        return (
          <DocumentUploadSection
            datasetId={projectIdNum}
          />
        );
      case "dataset":
        return <DatasetPreviewSection projectId={projectId} />;
      case "training":
        return <TrainingSection projectId={projectId} />;
      default:
        return <SystemMessageSection projectId={projectId} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold pb-2">{project.name}</h1>
        </div>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
            >
              <Trash2 className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                project and remove all of its data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => confirmDeleteProject()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Render the current section */}
      {renderSection()}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-gray-100">
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              Are you sure you want to delete this project? This action cannot
              be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
