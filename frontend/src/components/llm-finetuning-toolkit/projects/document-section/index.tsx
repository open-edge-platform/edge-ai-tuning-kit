// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { List, Grid, Loader2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadDialog } from "./upload-dialog";
import { DocumentGridView } from "./document-grid-view";
import { DocumentListView } from "./document-list-view";
import { DocumentDetailsView } from "./document-details-view";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useTextEmbeddingSources } from "@/hooks/llm-finetuning-toolkit/use-datasets";

// Loading state placeholder for sources
function SourcesLoadingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Loading document sources...
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
        Please wait while we retrieve your document library.
      </p>
    </div>
  );
}

// Error state placeholder for sources
function SourcesErrorPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
      <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Error loading documents
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
        {message ||
          "There was a problem retrieving your documents. Please try again."}
      </p>
      <Button
        variant="outline"
        onClick={() => window.location.reload()}
        className="mt-2"
      >
        Try Again
      </Button>
    </div>
  );
}

export function DocumentUploadSection({
  datasetId,
}: {
  datasetId: number;
}) {
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Fetch text embedding sources from the parent component
  const {
    data: sources = [],
    isLoading: loadingSources,
    isError: sourcesError,
    error: sourcesErrorData,
  } = useTextEmbeddingSources(datasetId);

  // Map sources to Document type for UI
  const documents = sources.map((source: string, index: number) => ({
    id: index.toString(),
    name: source,
    source: source,
    pages: 0,
    selected: selectedSource === source,
  }));

  const handleSelectDocument = (source: string) => {
    setSelectedSource(selectedSource === source ? null : source);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="dark:text-gray-100">
                Document Library
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Manage your uploaded documents. Click on any document to view its chunks and details.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <UploadDialog
                datasetId={datasetId}
                chunkSize={chunkSize}
                chunkOverlap={chunkOverlap}
                setChunkSize={setChunkSize}
                setChunkOverlap={setChunkOverlap}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end items-center mb-4">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid View</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>List View</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {loadingSources ? (
              <SourcesLoadingPlaceholder />
            ) : sourcesError ? (
              <SourcesErrorPlaceholder
                message={
                  (sourcesErrorData as Error)?.message ||
                  "Failed to load document sources."
                }
              />
            ) : (
              <>
                {viewMode === "grid" ? (
                  <DocumentGridView
                    datasetId={datasetId}
                    selectedDocument={selectedSource}
                    onSelectDocument={handleSelectDocument}
                    documents={documents}
                  />
                ) : (
                  <DocumentListView
                    datasetId={datasetId}
                    selectedDocument={selectedSource}
                    onSelectDocument={handleSelectDocument}
                    documents={documents}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {selectedSource && (
          <DocumentDetailsView
            datasetId={datasetId}
            selectedSource={selectedSource}
            chunkSize={chunkSize}
            chunkOverlap={chunkOverlap}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
