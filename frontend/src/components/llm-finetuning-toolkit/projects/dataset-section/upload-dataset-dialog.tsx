// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FileUp, FileText, CheckCircle2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useUploadFile } from "@/hooks/llm-finetuning-toolkit/use-data";

interface UploadDatasetContentProps {
  onUpload: (file: File) => void;
  onCancel: () => void;
  datasetId: number;
}

export function UploadDatasetContent({
  onUpload,
  onCancel,
  datasetId,
}: UploadDatasetContentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showFormatExample, setShowFormatExample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFileMutation = useUploadFile();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!datasetId) {
      toast.error("Dataset ID is missing");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Start progress animation for better UX
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        // Don't go to 100% until we actually complete
        return prev < 90 ? prev + 5 : prev;
      });
    }, 100);

    // Use the real upload hook
    uploadFileMutation.mutate(
      { 
        datasetId: datasetId, // Ensure datasetId is passed correctly
        files: [selectedFile] 
      },
      {
        onSuccess: () => {
          clearInterval(interval);
          setUploadProgress(100);
          setTimeout(() => {
            onUpload(selectedFile);
            setIsUploading(false);
            setSelectedFile(null);
            toast.success("Dataset uploaded successfully");
          }, 500);
        },
        onError: (error) => {
          clearInterval(interval);
          setIsUploading(false);
          toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  };

  return (
    <div className="space-y-4 w-full">
      {isUploading ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileUp size={16} className="text-blue-600 flex-shrink-0" />
                <span className="font-medium truncate">
                  {selectedFile?.name
                    ? `Uploading ${selectedFile.name}...`
                    : "Uploading file..."}
                </span>
              </div>
              <span className="font-medium ml-2 flex-shrink-0">
                {uploadProgress}%
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-md border p-4 flex flex-col items-center justify-center min-h-[150px]">
            <div className="text-center">
              <div className="relative inline-flex mx-auto mb-3">
                <div className="absolute inset-0 rounded-full bg-blue-200 dark:bg-blue-900/30 animate-ping opacity-75"></div>
                <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60">
                  <FileUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="text-base font-medium mb-1">Processing your file</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                This may take a moment depending on the size of your dataset.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
            <button 
              onClick={() => setShowFormatExample(!showFormatExample)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                  Format Requirements
                </p>
              </div>
              {showFormatExample ? (
                <ChevronUp className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              )}
            </button>
            
            {showFormatExample && (
              <div className="mt-2 pl-6">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Your file should be in JSON format with an array of objects
                  containing messages in the chat conversation format.
                </p>

                <div className="relative mt-2 overflow-hidden">
                  <div className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded-md border border-slate-200 dark:border-slate-600 overflow-x-auto">
                    <code className="block whitespace-pre w-fit text-[11px]">
                      {`[
  {
    "messages": [
      {
        "role": "user",
        "content": "How is the weather today?"
      },
      {
        "role": "assistant",
        "content": "The weather is sunny today."
      }
    ]
  }
]`}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 border rounded-md p-3">
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center">
                <FileUp className="h-8 w-8 text-blue-600 dark:text-blue-500 mb-2 flex-shrink-0" />
                <h3 className="text-base font-medium mb-1">
                  Choose a file or drag it here
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Upload your JSON dataset file
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="h-7 text-xs"
                >
                  <FileText className="mr-2 h-3 w-3" />
                  Select File
                </Button>
                <Input
                  id="dataset-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                />
              </div>
            </div>

            {selectedFile && (
              <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-2 flex items-start">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                    File selected:
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 truncate">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}{" "}
                    KB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isUploading} size="sm">
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          {isUploading ? "Uploading..." : "Upload Dataset"}
        </Button>
      </div>
    </div>
  );
}

// For backward compatibility
export function UploadDatasetDialog() {
  return (
    <div>
      {/* This component is now replaced by AddDataDialog */}
      {/* Kept for backward compatibility */}
    </div>
  );
}
