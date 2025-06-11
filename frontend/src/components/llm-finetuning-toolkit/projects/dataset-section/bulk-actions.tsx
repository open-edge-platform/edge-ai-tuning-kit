// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import { Button } from "@/components/ui/button"
import { Trash2, Copy, CheckSquare, Square, Check } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"

interface BulkActionsProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDeleteSelected: () => void
  onExportSelected: () => void
  onConfirmForTraining: () => void
}

export function BulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onExportSelected,
  onConfirmForTraining,
}: BulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium dark:text-gray-200">{selectedCount} selected</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Selection
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="dark:bg-gray-800 dark:border-gray-700">
          <DropdownMenuItem onClick={onSelectAll} className="dark:text-gray-100 dark:hover:bg-gray-600">
            <CheckSquare className="mr-2 h-4 w-4" />
            Select All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDeselectAll} className="dark:text-gray-100 dark:hover:bg-gray-600">
            <Square className="mr-2 h-4 w-4" />
            Deselect All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" onClick={onExportSelected} disabled={selectedCount === 0}>
        <Copy className="mr-2 h-4 w-4" />
        Export
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
        disabled={selectedCount === 0}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-700"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirmDialog(true)}
        disabled={selectedCount === 0}
        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-700"
      >
        <Check className="mr-2 h-4 w-4" />
        Use for Training
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-gray-100">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              This will permanently delete {selectedCount} message pair{selectedCount !== 1 ? "s" : ""} from your
              dataset. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSelected()
                setShowDeleteDialog(false)
              }}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-gray-100">Confirm Training Data</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              You have selected {selectedCount} out of {totalCount} message pairs to use for training. Are you sure you
              want to proceed with this selection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onConfirmForTraining()
                setShowConfirmDialog(false)
              }}
              className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

