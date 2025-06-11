// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddPairContent } from "./add-pair-dialog"
import type { MessagePair, ChatMessage } from "./types"

interface EditDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataset: MessagePair | null
  onSave: (id: string, messages: ChatMessage[]) => void
}

export function EditDataDialog({ 
  open, 
  onOpenChange, 
  dataset,
  onSave
}: EditDataDialogProps) {
  if (!dataset) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[90vw] p-6 overflow-hidden rounded-lg shadow-lg border">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-semibold">Edit Dataset</DialogTitle>
        </DialogHeader>

        <AddPairContent
          onCancel={() => onOpenChange(false)}
          editPair={dataset}
          onEditPair={(id, messages) => {
            onSave(id, messages);
            onOpenChange(false);
          }}
          onAddPair={() => {}} // This will not be used in edit mode
        />
      </DialogContent>
    </Dialog>
  )
}