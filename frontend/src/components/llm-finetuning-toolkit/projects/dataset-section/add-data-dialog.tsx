// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddPairContent } from "./add-pair-dialog"
import { UploadDatasetContent } from "./upload-dataset-dialog"
import { GenerateDataContent } from "./generate-dialog"
import { MessageSquarePlus, Upload, Sparkles } from "lucide-react"
import type { ChatMessage } from "./types"
import { Badge } from "@/components/ui/badge"

interface AddDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddPair: (messages: ChatMessage[]) => void
  onUpload: (file: File) => void
  onGenerate: (numPairs: number, creativity: number) => void
  datasetId: number
  ongoingGeneration?: boolean
  generationProgress?: number
  generationStatus?: string
}

export function AddDataDialog({ 
  open, 
  onOpenChange, 
  onAddPair, 
  onUpload, 
  onGenerate, 
  datasetId,
  ongoingGeneration = false,
  generationProgress = 0,
  generationStatus = ""
}: AddDataDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[90vw] p-0 overflow-hidden rounded-lg shadow-lg border">
        <DialogHeader className="bg-slate-50 dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="text-2xl font-semibold">Add Training Data</DialogTitle>
          <DialogDescription className="text-base mt-1 text-slate-500 dark:text-slate-400">
            Choose a method to add data to your training dataset
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="add-pair" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-14 p-1 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <TabsTrigger 
              value="add-pair" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 rounded-md h-12 font-medium transition-all"
            >
              <div className="flex items-center gap-2">
                <MessageSquarePlus size={18} />
                <span>Add Message Pair</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="upload" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 rounded-md h-12 font-medium transition-all"
            >
              <div className="flex items-center gap-2">
                <Upload size={18} />
                <span>Upload Dataset</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="generate" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 rounded-md h-12 font-medium transition-all"
              disabled={ongoingGeneration}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <span>Auto Generate</span>
                {ongoingGeneration && (
                  <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                    {Math.round(generationProgress * 100)}%
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          </TabsList>

          <div className="p-6 overflow-hidden">
            <TabsContent value="add-pair" className="mt-0 animate-in fade-in-50 max-w-[98%] mx-auto">
              <AddPairContent
                onAddPair={(messages) => {
                  onAddPair(messages)
                  onOpenChange(false)
                }}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-0 animate-in fade-in-50 max-w-[98%] mx-auto">
              <UploadDatasetContent
                onUpload={(file) => {
                  onUpload(file)
                  onOpenChange(false)
                }}
                onCancel={() => onOpenChange(false)}
                datasetId={datasetId}
              />
            </TabsContent>

            <TabsContent value="generate" className="mt-0 animate-in fade-in-50 max-w-[98%] mx-auto">
              <GenerateDataContent
                onGenerate={() => {
                  onGenerate(0, 0) // We'll handle generation parameters in the component
                  onOpenChange(false)
                }}
                onCancel={() => onOpenChange(false)}
                datasetId={datasetId}
                ongoingGeneration={ongoingGeneration}
                generationProgress={generationProgress}
                generationStatus={generationStatus}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

