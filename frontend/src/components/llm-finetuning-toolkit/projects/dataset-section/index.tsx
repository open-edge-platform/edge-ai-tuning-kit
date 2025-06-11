// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { MessagePair, ChatMessage } from "./types";
import { DatasetItem } from "./dataset-item";
import { AddDataDialog } from "./add-data-dialog";
import { EditDataDialog } from "./edit-data-dialog";
import {
  CheckSquare,
  Trash2,
  Check,
  Plus,
  Square,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import {
  useDatasetData,
  useAddDataToDataset,
  useDataset,
} from "@/hooks/llm-finetuning-toolkit/use-datasets";
import {
  useDeleteData,
  useUpdateData,
  useStopDataGeneration,
} from "@/hooks/llm-finetuning-toolkit/use-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function DatasetPreviewSection({ projectId }: { projectId: string }) {
  const datasetId = parseInt(projectId, 10);

  // Fetch dataset info to check if there's ongoing generation
  const { data: dataset } = useDataset(
    datasetId,
    1000
  );
  const ongoingGeneration =
    dataset?.generation_metadata?.status === "LOADING MODEL" ||
    dataset?.generation_metadata?.status === "GENERATING DATA";

  // Calculate progress based on processed_files and total_files
  const processedPages = dataset?.generation_metadata?.current_page || 0;
  const totalPagesPerFile = dataset?.generation_metadata?.total_page || 1; // Prevent division by zero
  const processedFiles = dataset?.generation_metadata?.processed_files || 0;
  const totalFiles = dataset?.generation_metadata?.total_files || 1; // Prevent division by zero
  const generationProgress =
    processedPages > 0 ? processedFiles / totalFiles : 0;
  const generationStatus = dataset?.generation_metadata?.status || "";

  // Initialize the stop data generation mutation
  const stopDataGenerationMutation = useStopDataGeneration();

  const { data: datasetItems, isLoading, error } = useDatasetData(datasetId);
  const addDataToDatasetMutation = useAddDataToDataset(datasetId);
  const deleteDataMutation = useDeleteData();
  const updateDataMutation = useUpdateData();
  const [datasets, setDatasets] = useState<MessagePair[]>([]);

  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [confirmedForTraining, setConfirmedForTraining] = useState<string[]>(
    []
  );
  const [editDataset, setEditDataset] = useState<MessagePair | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (datasetItems && datasetItems.length > 0) {
      const convertedDatasets = datasetItems.map((item) => {
        const data: MessagePair = {
          id: item.id.toString(),
          createdAt: item.created_date
            ? new Date(item.created_date)
            : new Date(),
          raw_data: item.raw_data,
          isGenerated: item.isGenerated,
          dataset_id: item.dataset_id,
        };

        try {
          if (item.raw_data) {
            const rawData =
              typeof item.raw_data === "string"
                ? JSON.parse(item.raw_data)
                : item.raw_data;

            // If data is already in OpenAI messages format, use it directly
            if (Array.isArray(rawData.messages)) {
              data.messages = rawData.messages;
            }
            // Convert legacy format to OpenAI messages format
            else {
              const messages: ChatMessage[] = [];

              // Add system message if present
              if (rawData.systemMessage) {
                messages.push({
                  role: "system",
                  content: rawData.systemMessage,
                });
              }

              // Add user message from various possible sources
              const userContent = rawData.userMessage || rawData.prompt || "";
              messages.push({
                role: "user",
                content: userContent,
              });

              // Add assistant message(s) from various possible sources
              const assistantContent =
                rawData.assistantMessage || rawData.completion || "";
              if (Array.isArray(assistantContent)) {
                assistantContent.forEach((content) => {
                  messages.push({
                    role: "assistant",
                    content,
                  });
                });
              } else {
                messages.push({
                  role: "assistant",
                  content: assistantContent,
                });
              }

              data.messages = messages;
            }
          }
        } catch (error) {
          console.error("Error parsing raw_data:", error);
        }

        return data;
      });

      setDatasets(convertedDatasets);
    }
  }, [datasetItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const handleAddDataset = (messages: ChatMessage[]) => {
    // Create the data structure expected by the backend
    const rawData = {
      messages: messages,
    };

    // Add the data to the backend using the mutation hook
    addDataToDatasetMutation.mutate(
      {
        raw_data: rawData,
        isGenerated: false,
      },
      {
        onSuccess: () => {
          toast.success("Dataset added successfully");
        },
        onError: (error) => {
          console.error("Error adding dataset:", error);
          toast.error("Failed to add dataset to the server");
        },
      }
    );
  };

  const handleDeleteDataset = (id: string) => {
    // Delete the data from the backend server
    deleteDataMutation.mutate(parseInt(id), {
      onSuccess: () => {
        // Update local state only after successful deletion from server
        setDatasets(datasets.filter((dataset) => dataset.id !== id));
        setSelectedDatasets(
          selectedDatasets.filter((datasetId) => datasetId !== id)
        );
        setConfirmedForTraining(
          confirmedForTraining.filter((datasetId) => datasetId !== id)
        );
        toast.success("The dataset has been removed.");
      },
      onError: (error) => {
        console.error("Error deleting dataset:", error);
        toast.error("Failed to delete dataset from the server");
      },
    });
  };

  const handleSelectDataset = (id: string) => {
    setSelectedDatasets((prev) =>
      prev.includes(id)
        ? prev.filter((datasetId) => datasetId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDatasets.length === datasets.length) {
      setSelectedDatasets([]);
    } else {
      const allIds = datasets.map((dataset) => dataset.id);
      setSelectedDatasets(allIds);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDatasets.length === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmDeleteSelected = () => {
    // First delete all selected datasets from the backend
    selectedDatasets.map((id) =>
      deleteDataMutation.mutate(parseInt(id), {
        onSuccess: () => {
          // Individual success handling is done by the mutation
        },
        onError: (error) => {
          console.error(`Error deleting dataset ${id}:`, error);
          toast.error(`Failed to delete dataset ${id}`);
        },
      })
    );

    // Update local state after the deletion attempts
    setDatasets(
      datasets.filter((dataset) => !selectedDatasets.includes(dataset.id))
    );
    setSelectedDatasets([]);
    setConfirmedForTraining(
      confirmedForTraining.filter((id) => !selectedDatasets.includes(id))
    );
    toast.success(`${selectedDatasets.length} datasets removed.`);
  };

  const handleUploadDataset = (file: File) => {
    console.log(`Uploading dataset: ${file} ...`);
  };

  const handleGenerateData = (numPairs: number, creativity: number) => {
    console.log(`Generating ${numPairs} pairs with creativity ${creativity}...`);
  };

  const handleConfirmDatasetForTraining = (id: string) => {
    // Update the dataset to mark isGenerated as false when confirming for training
    updateDataMutation.mutate(
      {
        id: parseInt(id),
        data: { isGenerated: false },
      },
      {
        onSuccess: () => {
          // Update local state for the dataset
          setDatasets((prevDatasets) =>
            prevDatasets.map((dataset) =>
              dataset.id === id ? { ...dataset, isGenerated: false } : dataset
            )
          );

          // Toggle dataset in confirmed list
          setConfirmedForTraining((prev) =>
            prev.includes(id)
              ? prev.filter((datasetId) => datasetId !== id)
              : [...prev, id]
          );

          toast.success(
            confirmedForTraining.includes(id)
              ? "Dataset removed from training selection"
              : "Dataset confirmed for training"
          );
        },
        onError: (error) => {
          console.error(`Error updating dataset ${id}:`, error);
          toast.error(`Failed to confirm dataset ${id} for training`);
        },
      }
    );
  };

  const handleConfirmSelectedForTraining = () => {
    if (selectedDatasets.length === 0) return;
    setShowConfirmDialog(true);
  };

  const confirmSelectedForTraining = () => {
    // Update each selected dataset to mark isGenerated as true
    selectedDatasets.forEach((id) => {
      updateDataMutation.mutate(
        {
          id: parseInt(id),
          data: { isGenerated: false },
        },
        {
          onSuccess: () => {
            // Update local state for the dataset
            setDatasets((prevDatasets) =>
              prevDatasets.map((dataset) =>
                dataset.id === id ? { ...dataset, isGenerated: false } : dataset
              )
            );
          },
          onError: (error) => {
            console.error(`Error updating dataset ${id}:`, error);
            toast.error(`Failed to mark dataset ${id} for training`);
          },
        }
      );
    });

    // Add them to confirmed list
    const newConfirmed = [
      ...new Set([...confirmedForTraining, ...selectedDatasets]),
    ];
    setConfirmedForTraining(newConfirmed);
    setSelectedDatasets([]);
    toast.success(
      `${selectedDatasets.length} datasets confirmed for training.`
    );
  };

  const handleEditDataset = (dataset: MessagePair) => {
    setEditDataset(dataset);
    setIsEditDialogOpen(true);
  };

  // Function to handle saving edited dataset
  const handleSaveEditedDataset = (id: string, messages: ChatMessage[]) => {
    // Create the data structure expected by the backend
    const rawData = {
      messages: messages,
    };

    // Update the data in the backend using the updateDataMutation hook
    updateDataMutation.mutate(
      {
        id: parseInt(id),
        data: { raw_data: rawData },
      },
      {
        onSuccess: () => {
          // Update local state with the edited dataset
          setDatasets((prevDatasets) =>
            prevDatasets.map((dataset) =>
              dataset.id === id
                ? {
                    ...dataset,
                    messages: messages,
                    raw_data: rawData,
                  }
                : dataset
            )
          );
          toast.success("Dataset updated successfully");
        },
        onError: (error) => {
          console.error("Error updating dataset:", error);
          toast.error("Failed to update dataset");
        },
      }
    );
  };

  const filteredDatasets = datasets.filter((dataset) => {
    if (searchTerm === "") return true;
    const messages = dataset.messages || [];
    return messages.some((message) =>
      message.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Sort datasets by ID in ascending order
  const sortedDatasets = [...filteredDatasets].sort((a, b) => {
    return parseInt(a.id) - parseInt(b.id);
  });

  const totalPages = Math.max(
    1,
    Math.ceil(sortedDatasets.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDatasets = sortedDatasets.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const selectedCount = selectedDatasets.length;
  const allSelected =
    datasets.length > 0 && selectedDatasets.length === datasets.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-700 mb-4"></div>
          <div className="h-4 w-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-6">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <X className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium dark:text-gray-100 mb-2">
          Failed to load datasets
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-primary text-white hover:bg-primary/90"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold dark:text-gray-100">
            Dataset Management
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your data for training
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="font-medium text-base dark:text-gray-100 whitespace-nowrap mr-2">
                {searchTerm
                  ? `Search Results (${filteredDatasets.length} of ${datasets.length})`
                  : `All Datasets (${datasets.length})`}
              </h3>

              {ongoingGeneration && (
                <div>
                  <Badge
                    variant="outline"
                    className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center">
                        <div className="animate-spin mr-2 text-blue-500">
                          <div className="w-5 h-5 rounded-full border-2 border-solid border-blue-500 dark:border-blue-400 border-t-transparent"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className="text-gray-700 dark:text-gray-200 font-medium">
                            Generating Data ({processedFiles}/{totalFiles} docs)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-48 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-3 rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                              style={{
                                width: `${Math.round(
                                  totalPagesPerFile > 0
                                    ? (processedPages / totalPagesPerFile)
                                    : 0
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {Math.round(
                              totalPagesPerFile > 0
                                ? (processedPages / totalPagesPerFile)
                                : 0
                            )}
                            %
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          stopDataGenerationMutation.mutate(datasetId, {
                            onSuccess: () => {
                              toast.success(
                                "Data generation stopped successfully"
                              );
                            },
                            onError: (error) => {
                              console.error(
                                "Failed to stop generation:",
                                error
                              );
                              toast.error("Failed to stop data generation");
                            },
                          });
                        }}
                      >
                        Stop
                      </Button>
                    </div>
                  </Badge>
                </div>
              )}

              <Button
                className="bg-primary text-white hover:bg-primary/90 shadow-sm transition-colors"
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Dataset
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="border-gray-200 dark:border-gray-700 transition-colors"
              >
                {allSelected ? (
                  <>
                    <Square className="mr-1.5 h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-1.5 h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedCount === 0}
                className={`transition-colors ${
                  selectedCount === 0
                    ? "text-gray-400 border-gray-200 dark:text-gray-600 dark:border-gray-700"
                    : "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/20"
                }`}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleConfirmSelectedForTraining}
                disabled={selectedCount === 0}
                className={`transition-colors ${
                  selectedCount === 0
                    ? "text-gray-400 border-gray-200 dark:text-gray-600 dark:border-gray-700"
                    : "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-900/20"
                }`}
              >
                <Check className="mr-1.5 h-4 w-4" />
                Use for Training
              </Button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-10 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Search dataset"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" />
                  </button>
                )}
              </div>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(Number(value))}
              >
                <SelectTrigger className="w-24 h-9 text-sm border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Items/Page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-[600px] bg-white dark:bg-gray-900">
          <Accordion type="multiple" className="space-y-3">
            {paginatedDatasets.map((dataset) => (
              <DatasetItem
                key={dataset.id}
                dataset={dataset}
                isSelected={selectedDatasets.includes(dataset.id)}
                isConfirmedForTraining={confirmedForTraining.includes(
                  dataset.id
                )}
                onSelect={handleSelectDataset}
                onDelete={handleDeleteDataset}
                onEdit={(dataset) => handleEditDataset(dataset)}
                onConfirmForTraining={handleConfirmDatasetForTraining}
              />
            ))}
          </Accordion>
          {paginatedDatasets.length === 0 && (
            <div className="text-center py-16 h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed rounded-lg border-gray-300 dark:border-gray-700">
              {datasets.length === 0 ? (
                <>
                  <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-4">
                    <Plus className="h-6 w-6" />
                  </div>
                  <p className="text-lg font-medium mb-1">No datasets yet</p>
                  <p className="text-sm max-w-md">
                    Click Add Dataset to create your first training example.
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-4">
                    <Search className="h-6 w-6" />
                  </div>
                  <p className="text-lg font-medium mb-1">No results found</p>
                  <p className="text-sm">
                    No datasets match your search criteria.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {paginatedDatasets.length > 0 ? startIndex + 1 : 0} to{" "}
              {Math.min(startIndex + itemsPerPage, filteredDatasets.length)} of{" "}
              {filteredDatasets.length} items
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="mx-2 text-sm dark:text-gray-100">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-gray-100">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              This will permanently delete {selectedCount} dataset
              {selectedCount !== 1 ? "s" : ""} from your collection. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDeleteSelected();
                setShowDeleteDialog(false);
              }}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-gray-100">
              Confirm Training Data
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              You have selected {selectedCount} dataset
              {selectedCount !== 1 ? "s" : ""} to use for training. Are you sure
              you want to proceed with this selection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmSelectedForTraining();
                setShowConfirmDialog(false);
              }}
              className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddDataDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddPair={handleAddDataset}
        onUpload={handleUploadDataset}
        onGenerate={handleGenerateData}
        datasetId={datasetId}
        ongoingGeneration={ongoingGeneration}
        generationProgress={generationProgress}
        generationStatus={generationStatus}
      />

      <EditDataDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        dataset={editDataset}
        onSave={handleSaveEditedDataset}
      />
    </div>
  );
}
