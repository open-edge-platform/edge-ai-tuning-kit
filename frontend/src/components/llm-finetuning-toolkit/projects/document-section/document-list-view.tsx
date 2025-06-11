// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, FileIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDeleteTextEmbeddingsBySource } from "@/hooks/llm-finetuning-toolkit/use-datasets";
import { useGenerateDocumentQA } from "@/hooks/llm-finetuning-toolkit/use-data";
import type { Document } from "@/hooks/llm-finetuning-toolkit/use-datasets";

interface DocumentListViewProps {
  datasetId: number;
  selectedDocument: string | null;
  onSelectDocument: (source: string) => void;
  documents: Document[];
}

export function DocumentListView({
  datasetId,
  selectedDocument,
  onSelectDocument,
  documents,
}: DocumentListViewProps) {
  // Delete text embeddings by source mutation
  const deleteEmbeddingsBySourceMutation =
    useDeleteTextEmbeddingsBySource(datasetId);

  // Generate document QA mutation
  const generateDocumentQAMutation = useGenerateDocumentQA();

  // State for confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  // State for generate QA confirmation dialog
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [documentToGenerate, setDocumentToGenerate] = useState<string | null>(
    null
  );

  // Open the generate confirmation dialog
  const openGenerateConfirmation = (source: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToGenerate(source);
    setIsGenerateDialogOpen(true);
  };

  // Cancel generate operation
  const cancelGenerate = () => {
    setIsGenerateDialogOpen(false);
    setDocumentToGenerate(null);
  };

  // Confirm generate operation
  const confirmGenerate = () => {
    if (documentToGenerate) {
      generateDocumentQAMutation.mutate(
        {
          dataset_id: datasetId,
          source_filename: documentToGenerate,
          project_type: "chat",
        },
        {
          onSuccess: () => {
            toast.success("Document QA generation started.");
            setIsGenerateDialogOpen(false);
          },
          onError: () => {
            toast.error("Failed to start document QA generation.");
            setIsGenerateDialogOpen(false);
          },
        }
      );
    }
  };

  const onDelete = (source: string) => {
    deleteEmbeddingsBySourceMutation.mutate(source, {
      onSuccess: () => {
        toast.success("The document has been removed.");
        // If the deleted document was selected, let the parent know
        if (selectedDocument === source) {
          onSelectDocument(source); // This will toggle it off
        }
        // Close the dialog
        setIsDeleteDialogOpen(false);
      },
      onError: () => {
        toast.error("Failed to delete the document.");
        // Close the dialog
        setIsDeleteDialogOpen(false);
      },
    });
  };

  // Open the confirmation dialog
  const openDeleteConfirmation = (source: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(source);
    setIsDeleteDialogOpen(true);
  };

  // Cancel delete operation
  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  // Confirm delete operation
  const confirmDelete = () => {
    if (documentToDelete) {
      onDelete(documentToDelete);
    }
  };

  // Sort documents by ID
  const sortedDocuments = [...documents].sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <FileIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No documents available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4">
          Upload documents to create embeddings for your dataset.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Click the Upload Document button above to get started
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-md divide-y">
        <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 text-sm font-medium">
          <div className="col-span-1">ID</div>
          <div className="col-span-5">Document</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {sortedDocuments.map((doc) => (
          <div
            key={doc.id}
            className={`grid grid-cols-12 gap-4 p-3 items-center hover:bg-gray-50 cursor-pointer ${
              selectedDocument === doc.source ? "bg-blue-50" : ""
            }`}
            onClick={() => onSelectDocument(doc.source)}
          >
            <div className="col-span-1">
              <span className="text-xs font-mono">{doc.id}</span>
            </div>
            <div className="col-span-5 flex items-center gap-3">
              <FileIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">
                  <span className="text-blue-500 font-medium">
                    {doc.source}
                  </span>
                </p>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-1 justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-primary text-white hover:bg-primary/90 hover:text-white"
                    onClick={(e) => openGenerateConfirmation(doc.source, e)}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate Dataset with AI</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    onClick={(e) => openDeleteConfirmation(doc.source, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Document</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Document Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Confirmation Dialog */}
      <Dialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Document QA Generation</DialogTitle>
            <DialogDescription>
              Are you sure you want to generate QA for this document? This
              action may take some time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={cancelGenerate}>
              Cancel
            </Button>
            <Button className="bg-primary" onClick={confirmGenerate}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
