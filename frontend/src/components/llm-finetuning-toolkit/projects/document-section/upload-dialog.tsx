// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, Settings, Eye, ChevronDown, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreateTextEmbedding } from "@/hooks/llm-finetuning-toolkit/use-datasets";
import type { ChunkingPreset } from "@/hooks/llm-finetuning-toolkit/use-datasets";

const CHUNKING_PRESETS: ChunkingPreset[] = [
  {
    id: "balanced",
    name: "Balanced",
    description: "Good balance between context and precision",
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  {
    id: "high-context",
    name: "High Context",
    description: "Larger chunks for more context",
    chunkSize: 1500,
    chunkOverlap: 300,
  },
  {
    id: "fine-grained",
    name: "Fine-Grained",
    description: "Smaller chunks for more precise retrieval",
    chunkSize: 500,
    chunkOverlap: 100,
  },
];

interface UploadDialogProps {
  datasetId: number;
  chunkSize: number;
  chunkOverlap: number;
  setChunkSize: (size: number) => void;
  setChunkOverlap: (overlap: number) => void;
}

export function UploadDialog({
  datasetId,
  chunkSize,
  chunkOverlap,
  setChunkSize,
  setChunkOverlap,
}: UploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("balanced");
  const [showChunkingSettings, setShowChunkingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Use the real createTextEmbedding hook
  const createEmbeddingMutation = useCreateTextEmbedding(datasetId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  const handleUpload = (files: File[]) => {
    if (!validateChunkingSettings()) return;

    setIsUploading(true);
    setUploadProgress(10); // Initial progress indicator

    createEmbeddingMutation.mutate(
      { files, chunkSize, chunkOverlap },
      {
        onSuccess: () => {
          setUploadProgress(100);
          setIsUploading(false);
          toast.success("Document uploaded successfully");
          setIsOpen(false);
        },
        onError: (error) => {
          setIsUploading(false);
          toast.error("Failed to upload document: " + (error as Error).message);
        },
      }
    );
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropzoneRef.current) {
      dropzoneRef.current.classList.add("border-primary");
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropzoneRef.current) {
      dropzoneRef.current.classList.remove("border-primary");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropzoneRef.current) {
      dropzoneRef.current.classList.remove("border-primary");
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleUpload(files);
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = CHUNKING_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setChunkSize(preset.chunkSize);
      setChunkOverlap(preset.chunkOverlap);
      setSelectedPreset(presetId);
    }
  };

  const validateChunkingSettings = () => {
    if (chunkOverlap >= chunkSize) {
      toast.error("Chunk overlap must be smaller than chunk size.");
      return false;
    }
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF document to use for fine-tuning.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isUploading ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          ) : (
            <>
              <div
                ref={dropzoneRef}
                className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={openFileDialog}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium">
                  Drag and drop your PDF files here
                </p>
                <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Supported file type: PDF
              </p>
            </>
          )}

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChunkingSettings(!showChunkingSettings)}
              className="w-full justify-between"
            >
              <div className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Document Chunking Settings
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {showChunkingSettings && (
            <div className="space-y-4 p-4 border rounded-md mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Preset Settings</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      {CHUNKING_PRESETS.find((p) => p.id === selectedPreset)
                        ?.name || "Select Preset"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {CHUNKING_PRESETS.map((preset) => (
                      <DropdownMenuItem
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset.id)}
                        className="flex items-center gap-2"
                      >
                        {selectedPreset === preset.id && (
                          <Check className="h-4 w-4" />
                        )}
                        <div className="flex flex-col">
                          <span>{preset.name}</span>
                          <span className="text-xs text-gray-500">
                            {preset.description}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Chunk Size: {chunkSize} tokens</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          This is approximately {Math.round(chunkSize / 4)}{" "}
                          words or {Math.round(chunkSize / 0.75)} characters per
                          chunk.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Slider
                  value={[chunkSize]}
                  min={100}
                  max={2000}
                  step={50}
                  onValueChange={(value) => setChunkSize(value[0])}
                />
                <p className="text-xs text-gray-500">
                  Larger chunks include more context but may be less precise.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Chunk Overlap: {chunkOverlap} tokens</Label>
                  <span
                    className={`text-xs ${chunkOverlap >= chunkSize ? "text-red-500" : "text-gray-500"}`}
                  >
                    {Math.round((chunkOverlap / chunkSize) * 100)}% of chunk
                    size
                  </span>
                </div>
                <Slider
                  value={[chunkOverlap]}
                  min={0}
                  max={500}
                  step={10}
                  onValueChange={(value) => setChunkOverlap(value[0])}
                />
                <p className="text-xs text-gray-500">
                  Overlap helps maintain context between chunks.
                </p>
                {chunkOverlap >= chunkSize && (
                  <p className="text-xs text-red-500">
                    Overlap must be smaller than chunk size.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isUploading ||
              (!fileInputRef.current?.files?.length && !isUploading)
            }
            onClick={() => {
              if (
                fileInputRef.current?.files?.length &&
                validateChunkingSettings()
              ) {
                handleUpload(Array.from(fileInputRef.current.files));
              }
            }}
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
