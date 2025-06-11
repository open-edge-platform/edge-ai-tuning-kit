// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Trash2,
  ExternalLink,
  Check,
  Brain,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  AlertCircle,
  Square,
} from "lucide-react";
import { formatDistance } from "@/lib/utils";
import { Model } from "@/hooks/llm-finetuning-toolkit/use-models";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Action {
  label: string;
  icon: React.ReactNode;
  onClick: (modelId: number) => void;
  showWhen?: (model: Model) => boolean;
}

interface ModelsTableProps {
  models: Model[];
  onDelete: (id: number) => void;
  onDownload: (id: number) => void;
  onStopDownload?: (id: number) => void;
  actions?: Action[];
}

export function ModelsTable({
  models,
  onDelete,
  onDownload,
  onStopDownload,
  actions = [],
}: ModelsTableProps) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [paginatedModels, setPaginatedModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredModels, setFilteredModels] = useState<Model[]>(models);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);

  // Function to show delete confirmation dialog
  const handleShowDeleteDialog = (model: Model) => {
    setModelToDelete(model);
    setShowDeleteDialog(true);
  };

  // Function to handle confirmed deletion
  const handleConfirmDelete = () => {
    if (modelToDelete) {
      onDelete(modelToDelete.id);
      setShowDeleteDialog(false);
      setModelToDelete(null);
    }
  };

  // Function to cancel deletion
  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setModelToDelete(null);
  };

  // Handle search query changes - reset page when query changes
  useEffect(() => {
    if (searchQuery.trim() !== "") {
      setPage(1); // Reset to first page only when search query changes
    }
  }, [searchQuery]);
  
  // Filter models when search query or models change
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredModels(models);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = models.filter((model) =>
        model.model_id.toLowerCase().includes(query)
      );
      setFilteredModels(filtered);
    }
  }, [searchQuery, models]);

  // Update paginated models
  useEffect(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    setPaginatedModels(filteredModels.slice(startIndex, endIndex));
  }, [filteredModels, page, rowsPerPage]);

  const pageCount = Math.ceil(filteredModels.length / rowsPerPage);

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < pageCount) {
      setPage(page + 1);
    }
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value));
    setPage(1); // Reset to first page when changing rows per page
  };

  // Default actions if none provided
  useEffect(() => {
    if (actions.length === 0) {
      // Generate default actions here if needed
    }
  }, [actions]);

  // Function to get dynamic action buttons based on model state
  const getModelActions = (model: Model) => {
    // Default built-in actions
    const defaultActions: Action[] = [
      {
        label: "HuggingFace",
        icon: <ExternalLink className="h-4 w-4" />,
        onClick: () =>
          window.open(`https://huggingface.co/${model.model_id}`, "_blank"),
      },
      // Show Download button only if not already downloaded and not currently downloading
      ...(model.download_metadata.status !== "DOWNLOADING" && !model.is_downloaded
        ? [
            {
              label: "Download",
              icon: <Download className="h-4 w-4" />,
              onClick: () => onDownload(model.id),
            },
          ]
        : []),
      // Conditionally show either Download, Stop Download or Delete based on status
      ...(model.download_metadata.status !== "DOWNLOADING"
        ? [
            {
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleShowDeleteDialog(model),
            },
          ]
        : model.download_metadata.status === "DOWNLOADING" && onStopDownload
          ? [
              {
                label: "Stop Download",
                icon: <Square className="h-4 w-4" />,
                onClick: () => onStopDownload(model.id),
              },
            ]
          : []),
    ];

    // Combine with any user-provided actions that pass the showWhen test
    const customActions = actions.filter(
      (action) => !action.showWhen || action.showWhen(model)
    );

    return [...defaultActions, ...customActions];
  };

  return (
    <div className="rounded-md border bg-card">
      <div className="px-4 py-3 border-b">
        <div className="relative w-[250px]">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b">
            <th className="w-[50px] px-3 py-3 text-left text-sm font-medium text-muted-foreground">
              #
            </th>
            <th className="w-[250px] px-3 py-3 text-left text-sm font-medium text-muted-foreground">
              Name
            </th>
            <th className="w-[100px] px-3 py-3 text-left text-sm font-medium text-muted-foreground">
              Type
            </th>
            <th className="w-[150px] px-3 py-3 text-left text-sm font-medium text-muted-foreground">
              Progress
            </th>
            <th className="w-[120px] px-3 py-3 text-left text-sm font-medium text-muted-foreground">
              Added
            </th>
            <th className="w-[80px] px-3 py-3 text-right text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {paginatedModels.map((model, index) => (
            <tr
              key={model.id}
              className="group hover:bg-accent/50 transition-colors h-[68px]"
            >
              <td className="px-3 py-2 text-sm text-muted-foreground">
                {(page - 1) * rowsPerPage + index + 1}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 rounded-md bg-accent/50 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-accent-foreground/50" />
                    {model.is_downloaded && (
                      <div className="absolute -bottom-1 -right-1">
                        <Badge
                          variant="default"
                          className="h-4 w-4 rounded-full p-0 flex items-center justify-center"
                        >
                          <Check className="h-2 w-2" />
                        </Badge>
                      </div>
                    )}
                    {model.download_metadata.status === "DOWNLOADING" && (
                      <div className="absolute -bottom-1 -right-1">
                        <Badge
                          variant="secondary"
                          className="h-4 w-4 rounded-full p-0 flex items-center justify-center bg-amber-500"
                        >
                          <Loader2 className="h-2 w-2 animate-spin" />
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 max-w-[400px]">
                    <span className="font-medium text-sm break-words">
                      {model.model_id}
                    </span>
                    <span className="text-xs text-muted-foreground break-words">
                      {model.description}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="relative group">
                  <Badge
                    variant="outline"
                    className={
                      "capitalize bg-primary font-medium text-xs text-white py-0.5 px-1.5"
                    }
                  >
                    {model.model_metadata.model_type}
                  </Badge>
                </div>
              </td>
              <td className="px-3 py-2">
                {model.download_metadata.status === "DOWNLOADING" ? (
                  <div className="w-full">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${model.download_metadata.progress}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(model.download_metadata.progress)}%
                    </span>
                  </div>
                ) : model.download_metadata.status === "FAILURE" ? (
                  <div className="group relative">
                    <Badge
                      variant="outline"
                      className="bg-red-500/10 text-red-500 border-red-500/20"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" /> Failed
                    </Badge>
                    <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-card border rounded-md shadow-md text-xs text-card-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 pointer-events-none">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1">Download failed</p>
                          <p className="text-muted-foreground mb-1">Please check:</p>
                          <ul className="text-muted-foreground space-y-1">
                            <li className="flex items-center">
                              <span className="mr-2">•</span>Model name is correct
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">•</span>You have permission to access the model
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">•</span>Your network connection
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : model.is_downloaded ? (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-500 border-green-500/20"
                  >
                    <Check className="h-3 w-3 mr-1" /> Complete
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-muted/50 text-muted-foreground border-muted/30"
                  >
                    Not downloaded
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {formatDistance(new Date(model.created_date), new Date(), {
                  addSuffix: true,
                })}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end space-x-1">
                  {getModelActions(model).map((action, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => action.onClick(model.id)}
                      title={action.label}
                    >
                      {action.icon}
                    </Button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div className="border-t px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={handleRowsPerPageChange}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={rowsPerPage.toString()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>
            {filteredModels.length === 0
              ? "0 of 0"
              : `${(page - 1) * rowsPerPage + 1}-${Math.min(
                  page * rowsPerPage,
                  filteredModels.length
                )} of ${filteredModels.length}`}
          </span>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePreviousPage}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextPage}
              disabled={page >= pageCount}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete model{" "}
              <span className="font-semibold">{modelToDelete?.model_id}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
