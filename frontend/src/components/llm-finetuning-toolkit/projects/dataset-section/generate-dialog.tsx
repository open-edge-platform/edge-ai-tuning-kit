// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Info, Upload, X } from "lucide-react";
import { useGenerateQA } from "@/hooks/llm-finetuning-toolkit/use-data";
import { toast } from "sonner";

interface GenerateDataContentProps {
  datasetId: number;
  onGenerate: () => void;
  onCancel: () => void;
  ongoingGeneration?: boolean;
  generationProgress?: number;
  generationStatus?: string;
}

export function GenerateDataContent({
  datasetId,
  onGenerate,
  onCancel,
  ongoingGeneration = false,
  generationProgress = 0,
  generationStatus = "",
}: GenerateDataContentProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const projectType = "";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateQA = useGenerateQA();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((file) => {
        const validExtensions = [".pdf", ".txt"];
        const extension = file.name
          .slice(file.name.lastIndexOf("."))
          .toLowerCase();
        return validExtensions.includes(extension);
      });

      if (validFiles.length !== files.length) {
        toast.error("Invalid file type", {
          description: "Only PDF, TXT files are supported.",
        });
      }

      setSelectedFiles(validFiles);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (selectedFiles.length === 0) {
      toast.error("Generation failed", {
        description: "Please select at least one document to generate data from.",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          return 95;
        }
        return prev + Math.floor(Math.random() * 2) + 1;
      });
    }, 500);

    generateQA.mutate(
      {
        dataset_id: datasetId,
        project_type: projectType,
        files: selectedFiles,
      },
      {
        onSuccess: () => {
          clearInterval(interval);
          setProgress(100);

          setTimeout(() => {
            toast.success("Upload complete", {
              description: "Starting to generate training examples",
            });
            onGenerate();
            setIsGenerating(false);
          }, 500);
        },
        onError: () => {
          clearInterval(interval);
          setIsGenerating(false);
          toast.error("Generation failed", {
            description: "Failed to generate data. Please try again.",
          });
        },
      }
    );
  };

  if (ongoingGeneration) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                <span className="font-medium">
                  {generationStatus === "running"
                    ? "Generating training examples..."
                    : "Preparing generation..."}
                </span>
              </div>
              <span className="font-medium">
                {Math.round(generationProgress * 100)}%
              </span>
            </div>
            <Progress
              value={Math.round(generationProgress * 100)}
              className="h-2"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-md border p-6 flex flex-col items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="relative inline-flex mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-blue-200 dark:bg-blue-900/30 animate-ping opacity-75"></div>
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/60">
                  <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">
                AI is generating your data
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Processing your documents...
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isGenerating ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                <span className="font-medium">
                  Generating training examples...
                </span>
              </div>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-md border p-6 flex flex-col items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="relative inline-flex mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-blue-200 dark:bg-blue-900/30 animate-ping opacity-75"></div>
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/60">
                  <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">
                AI is generating your data
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                We are analyzing your documents and creating relevant training
                examples. This may take a few minutes depending on complexity.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                Important
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                This feature uses AI to generate training examples based on your
                uploaded documents. For best results, ensure you upload
                relevant, high-quality documents.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 border rounded-md p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-md font-medium mb-2 block">
                  Upload Documents
                </Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.txt"
                  multiple
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-md p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Click to upload documents
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Supported formats: PDF, TXT
                  </p>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium block">
                    Selected Documents
                  </Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-md border"
                      >
                        <span className="text-sm truncate max-w-[85%]">
                          {file.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isGenerating}>
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={
            isGenerating || (selectedFiles.length === 0 && !isGenerating)
          }
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isGenerating ? "Generating..." : "Generate Data"}
        </Button>
      </div>
    </div>
  );
}
