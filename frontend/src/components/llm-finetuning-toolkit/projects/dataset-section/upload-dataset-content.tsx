// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

interface UploadDatasetContentProps {
  onUpload: (file: File) => void
  onCancel: () => void
}

export function UploadDatasetContent({ onUpload, onCancel }: UploadDatasetContentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 100)

    // Simulate upload completion
    setTimeout(() => {
      clearInterval(interval)
      setUploadProgress(100)

      setTimeout(() => {
        onUpload(selectedFile)
        setIsUploading(false)
        setSelectedFile(null)
      }, 500)
    }, 2000)
  }

  return (
    <div className="space-y-4">
      {isUploading ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm mb-1">
            <span>Uploading {selectedFile?.name}...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="dataset-upload">Select Dataset File</Label>
          <Input
            id="dataset-upload"
            type="file"
            accept=".txt,.json,.jsonl"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          {selectedFile && (
            <p className="text-sm text-green-600">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Format Example</Label>
        <pre className="bg-slate-100 p-4 rounded-md text-xs overflow-x-auto">
          {`[
  {
    "user_message": "How do I implement a binary search algorithm?",
    "assistant_message": "Binary search is an efficient algorithm..."
  }
]`}
        </pre>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  )
}

