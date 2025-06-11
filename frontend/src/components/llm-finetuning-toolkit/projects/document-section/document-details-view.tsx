// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useState } from "react";
import {
  FileQuestion,
  Loader2,
  AlertCircle,
  FileText,
  Layers,
  Hash,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentChunksPagination } from "./document-chunks-pagination";
import { useTextEmbedding, TextEmbedding } from "@/hooks/llm-finetuning-toolkit/use-datasets";

interface DocumentDetailsViewProps {
  datasetId: number;
  selectedSource: string | null;
  chunkSize: number;
  chunkOverlap: number;
}

// Loading state placeholder for embeddings
function EmbeddingsLoadingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[30vh] p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Loading document chunks...
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
        Please wait while we retrieve the document content.
      </p>
    </div>
  );
}

// Error state placeholder for embeddings
function EmbeddingsErrorPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[30vh] p-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
      <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Error loading document content
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
        {message ||
          "There was a problem retrieving the document chunks. Please try again."}
      </p>
    </div>
  );
}

export function DocumentDetailsView({
  datasetId,
  selectedSource,
  chunkSize,
  chunkOverlap,
}: DocumentDetailsViewProps) {
  const [textEmbeddingPage, setTextEmbeddingPage] = useState(1);
  const chunksPerPage = 5;

  // Fetch text embeddings for selected source
  const {
    data: textEmbeddingsResponse,
    isLoading: loadingEmbeddings,
    isError: embeddingsError,
    error: embeddingsErrorData,
  } = useTextEmbedding(
    datasetId,
    textEmbeddingPage,
    chunksPerPage,
    selectedSource || undefined
  );

  // Extract doc_chunks from the response
  const textEmbeddings = textEmbeddingsResponse?.doc_chunks || [];
  const totalPages = textEmbeddingsResponse?.total_pages || 1;

  if (!selectedSource) {
    return null;
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="dark:text-gray-100">Document Details</CardTitle>
        <CardDescription className="dark:text-gray-400">
          {selectedSource}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chunks">
          <TabsList className="mb-4">
            <TabsTrigger value="chunks">Chunks</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>
          <TabsContent value="chunks">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium dark:text-gray-100">
                  Document Chunks
                </h4>
                {loadingEmbeddings ? (
                  <EmbeddingsLoadingPlaceholder />
                ) : embeddingsError ? (
                  <EmbeddingsErrorPlaceholder
                    message={
                      (embeddingsErrorData as Error)?.message ||
                      "Failed to load document chunks."
                    }
                  />
                ) : textEmbeddings && textEmbeddings.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {textEmbeddings.map((embedding: TextEmbedding, i: number) => (
                        <div
                          key={embedding.ids || i}
                          className="p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all dark:border-gray-700 dark:hover:border-blue-500 dark:bg-gray-800"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium dark:bg-blue-900 dark:text-blue-200">
                                {i + 1}
                              </span>
                              <span className="text-sm font-medium dark:text-gray-100">
                                Chunk {i + 1}
                              </span>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              {embedding.source}{" "}
                              {embedding.page !== undefined
                                ? `• Page ${embedding.page + 1}`
                                : ""}
                            </span>
                          </div>
                          <div className="p-3 rounded bg-gray-50 dark:bg-gray-900 mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono border-l-2 border-blue-300 dark:border-blue-700">
                            {embedding.chunk}
                          </div>
                        </div>
                      ))}
                    </div>

                    <DocumentChunksPagination
                      currentPage={textEmbeddingPage}
                      totalPages={totalPages}
                      onPageChange={setTextEmbeddingPage}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-md text-center">
                    <FileQuestion className="h-10 w-10 text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                      No chunks found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
                      No text chunks were found for this document. If you just
                      uploaded this document, it may still be processing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metadata">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                    <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-medium dark:text-gray-100">
                    Document Information
                  </h3>
                </div>
                <div className="space-y-3 pl-10">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      File Name
                    </p>
                    <p className="font-medium text-sm dark:text-gray-100 truncate">
                      {selectedSource || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Source
                    </p>
                    <p className="font-medium text-sm dark:text-gray-100 truncate">
                      {selectedSource || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-full">
                    <Layers className="h-5 w-5 text-green-500 dark:text-green-400" />
                  </div>
                  <h3 className="text-sm font-medium dark:text-gray-100">
                    Content Statistics
                  </h3>
                </div>
                <div className="space-y-3 pl-10">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Total Pages
                    </p>
                    <p className="font-medium text-sm dark:text-gray-100">
                      {textEmbeddingsResponse?.total_pages || "-"}{" "}
                      {textEmbeddingsResponse?.total_pages &&
                      textEmbeddingsResponse.total_pages > 1
                        ? "pages"
                        : "page"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Total Chunks
                    </p>
                    <p className="font-medium text-sm dark:text-gray-100">
                      {textEmbeddingsResponse?.num_embeddings || "-"}{" "}
                      {textEmbeddingsResponse?.num_embeddings &&
                      textEmbeddingsResponse.num_embeddings > 1
                        ? "chunks"
                        : "chunk"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition-colors md:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-full">
                    <Hash className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                  </div>
                  <h3 className="text-sm font-medium dark:text-gray-100">
                    Chunking Configuration
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-6 pl-10">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Chunk Size
                    </p>
                    <p className="font-medium text-sm dark:text-gray-100">
                      {chunkSize} tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Chunk Overlap
                    </p>
                    <p className="font-medium text-sm dark:text-gray-100">
                      {chunkOverlap} tokens
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
