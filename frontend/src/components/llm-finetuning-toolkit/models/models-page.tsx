// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/llm-finetuning-toolkit/dashboard/dashboard-header";
import { ModelsTable } from "@/components/llm-finetuning-toolkit/models/models-table";
import { ModelDialog } from "@/components/llm-finetuning-toolkit/models/model-dialog";
import { Import } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useModels,
  useCreateModel,
  useDeleteModel,
  useDownloadModel,
  useStopDownloadModel,
} from "@/hooks/llm-finetuning-toolkit/use-models";
import {
  LoadingPlaceholder,
  ErrorPlaceholder,
  EmptyPlaceholder,
} from "@/components/llm-finetuning-toolkit/common/placeholder";
import {
  CreateModelPayload,
  Model,
} from "@/hooks/llm-finetuning-toolkit/use-models";

export function ModelsPage() {
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  // UseModels hook now includes built-in polling with refetchInterval
  const {
    data: models,
    isLoading: modelsLoading,
    error: modelsError,
  } = useModels();

  // Sort models by ID before passing to the table
  const sortedModels = models ? [...models].sort((a, b) => a.id - b.id) : [];

  // Hook for creating a new model
  const createModelMutation = useCreateModel();
  const deleteModelMutation = useDeleteModel();
  const downloadModelMutation = useDownloadModel();
  const stopDownloadModelMutation = useStopDownloadModel();

  const handleNewModel = () => {
    setSelectedModel(null);
    setOpen(true);
  };

  const handleSaveModel = (modelData: CreateModelPayload) => {
    try {
      if (selectedModel) {
        toast.success("Model information has been updated successfully.");
      } else {
        // Create a new model using the API
        createModelMutation.mutate(modelData, {
          onSuccess: () => {
            toast.success("Model has been added to your library.");
            setOpen(false);
          },
          onError: (error) => {
            toast.error(
              `Error adding model: ${error.message || "Unknown error"}`
            );
          },
        });
      }
    } catch {
      toast.error(`There was an error saving the model.`);
    }
  };

  const handleDeleteModel = (id: number) => {
    try {
      deleteModelMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Model has been removed from your library.");
          if (selectedModel?.id === id) {
            setOpen(false);
          }
        },
        onError: (error) => {
          toast.error(
            `Error deleting model: ${error.message || "Unknown error"}`
          );
        },
      });
    } catch {
      toast.error(
        `There was an error deleting the model.
        `
      );
    }
  };

  const handleDownloadModel = (id: number) => {
    try {
      downloadModelMutation.mutate(id, {
        onSuccess: () => {
          toast.success("The model download has been initiated.");
        },
        onError: (error) => {
          toast.error(
            `Error starting download: ${error.message || "Unknown error"}`
          );
        },
      });
    } catch {
      toast.error(
        `There was an error starting the download.
        `
      );
    }
  };

  const handleStopDownloadModel = (id: number) => {
    try {
      stopDownloadModelMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Model download has been stopped.");
        },
        onError: (error) => {
          toast.error(
            `Error stopping download: ${error.message || "Unknown error"}`
          );
        },
      });
    } catch {
      toast.error(
        `There was an error stopping the download.
        `
      );
    }
  };

  return (
    <>
      <DashboardHeader heading="Models" text="Manage your language models">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleNewModel}
            disabled={modelsLoading || !!modelsError}
          >
            <Import className="mr-2 h-4 w-4" />
            Import Model
          </Button>
        </div>
      </DashboardHeader>

      {modelsLoading ? (
        <LoadingPlaceholder message="Loading models..." />
      ) : modelsError ? (
        <ErrorPlaceholder
          title="Unable to load models"
          message="There was a problem connecting to the server. Please try again later."
          onRetry={() => window.location.reload()}
        />
      ) : (
        <div className="mt-6">
          {sortedModels.length === 0 ? (
            <EmptyPlaceholder
              icon={Import}
              title="No models available"
              description="Import your first model to get started with fine-tuning and deployment."
              action={
                <Button onClick={handleNewModel}>
                  <Import className="mr-2 h-4 w-4" />
                  Import Model
                </Button>
              }
            />
          ) : (
            <ModelsTable
              models={sortedModels}
              onDelete={handleDeleteModel}
              onDownload={handleDownloadModel}
              onStopDownload={handleStopDownloadModel}
            />
          )}
        </div>
      )}
      <ModelDialog
        open={open}
        setOpen={setOpen}
        selectedModel={selectedModel}
        onSave={handleSaveModel}
        existingModels={sortedModels} // Pass the list of existing models
      />
    </>
  );
}
