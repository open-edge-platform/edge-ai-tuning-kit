// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Edit, Check, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { MessagePair } from "./types";
import { AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MarkdownRenderer } from "@/components/llm-finetuning-toolkit/common/markdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DatasetItemProps {
  dataset: MessagePair;
  isSelected: boolean;
  isConfirmedForTraining: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (dataset: MessagePair) => void;
  onConfirmForTraining: (id: string) => void;
}

// Helper function to format messages into OpenAI chat format
function formatChatMessages(dataset: MessagePair) {
  // If we already have properly formatted messages, use those
  if (dataset.messages && dataset.messages.length > 0) {
    return dataset.messages;
  }

  // If no messages are available, return an empty array
  return [];
}

// Helper function to count words
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

export function DatasetItem({
  dataset,
  isSelected,
  isConfirmedForTraining,
  onSelect,
  onDelete,
  onEdit,
  onConfirmForTraining,
}: DatasetItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllTurns, setShowAllTurns] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Format messages in OpenAI chat format
  const messages = formatChatMessages(dataset);

  // Get the first turn (up to the first assistant response)
  const firstTurn = messages.filter(
    (msg, idx) =>
      msg.role === "system" ||
      idx <= messages.findIndex((m) => m.role === "assistant")
  );

  // Get remaining turns (everything after the first assistant response)
  const hasAdditionalTurns = messages.length > firstTurn.length;
  const remainingTurns = hasAdditionalTurns
    ? messages.slice(firstTurn.length)
    : [];

  // Check if there are multiple turns to enable/disable accordion
  const hasMultipleTurns =
    messages.filter((m) => m.role === "assistant").length > 1;

  const toggleAccordion = () => {
    // Only toggle if there are multiple turns
    if (hasMultipleTurns) {
      setIsOpen(!isOpen);
    }
  };

  const toggleAllTurns = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllTurns(!showAllTurns);
  };

  // Count total words in all messages
  const totalWords = messages.reduce(
    (total, msg) => total + countWords(msg.content),
    0
  );

  return (
    <AccordionItem
      value={dataset.id}
      className={`border rounded-md mb-4 overflow-hidden dark:border-gray-700 ${
        dataset.isGenerated ? "border-yellow-500" : ""
      }`}
    >
      <div
        className={`bg-white dark:bg-gray-800 p-4 ${
          hasMultipleTurns ? "cursor-pointer" : ""
        } ${isOpen ? "border-b dark:border-gray-700" : ""}`}
        onClick={toggleAccordion}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col items-start gap-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(dataset.id)}
              className="mb-1"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onConfirmForTraining(dataset.id);
              }}
              disabled={!dataset.isGenerated}
              className={`h-6 w-6 ${
                isConfirmedForTraining
                  ? "text-green-500 bg-green-50 dark:bg-green-900/20"
                  : ""
              } ${
                !dataset.isGenerated && !isConfirmedForTraining
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(dataset);
              }}
              className="h-6 w-6"
            >
              <Edit className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              className="h-6 w-6"
            >
              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
            </Button>
            {hasMultipleTurns && (
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isOpen ? "transform rotate-180" : ""
                }`}
              />
            )}
          </div>
        </div>

        {/* Dataset entry summary - always visible */}
        <div className="text-sm text-left w-full pr-8 dark:text-gray-100">
          <div className="flex flex-col w-full">
            {firstTurn.map((message, index) => (
              <div
                key={index}
                className={`${index > 0 ? "mt-2" : ""} ${
                  index === firstTurn.length - 1 ? "mb-2" : ""
                } p-3 rounded-md ${
                  message.role === "system"
                    ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                    : message.role === "user"
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                }`}
              >
                <Badge
                  variant="outline"
                  className={`${
                    message.role === "system"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100"
                      : message.role === "user"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      : "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                  } mb-2 text-xs`}
                >
                  {message.role === "system"
                    ? "System"
                    : message.role === "user"
                    ? "User"
                    : "Assistant"}
                </Badge>
                <MarkdownRenderer content={message.content} />
              </div>
            ))}
            <div className="flex justify-end mt-2">
              <Badge
                variant="outline"
                className="shrink-0 dark:border-gray-600"
              >
                {messages.filter((m) => m.role === "assistant").length}{" "}
                {messages.filter((m) => m.role === "assistant").length === 1
                  ? "response"
                  : "responses"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Dataset metadata */}
        <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{new Date(dataset.createdAt).toLocaleDateString()}</span>
          <span className="mx-2">•</span>
          <span>{totalWords} total words</span>
          <span className="mx-2">•</span>
          <span>
            {messages.filter((m) => m.role === "assistant").length > 1
              ? `${Math.ceil(messages.length / 2)} turns`
              : "1 turn"}
          </span>
          <span className="mx-2">•</span>
          {dataset.isGenerated ? (
            <Badge
              variant="outline"
              className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs border-yellow-200 dark:border-yellow-800"
            >
              Non-Verified Data
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs border-green-200 dark:border-green-800"
            >
              Verified Data
            </Badge>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-6 pt-4 bg-gray-50 dark:bg-gray-700">
          {/* First turn - always shown when expanded */}
          <div className="space-y-4 mb-4">
            {firstTurn.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-md ${
                  message.role === "system"
                    ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                    : message.role === "user"
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                }`}
              >
                <Badge
                  variant="outline"
                  className={`${
                    message.role === "system"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100"
                      : message.role === "user"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      : "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                  } mb-2 text-xs`}
                >
                  {message.role === "system"
                    ? "System"
                    : message.role === "user"
                    ? "User"
                    : "Assistant"}
                </Badge>
                <MarkdownRenderer content={message.content} />
              </div>
            ))}
          </div>

          {/* Show toggle for additional turns if they exist */}
          {hasAdditionalTurns && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={toggleAllTurns}
                className="w-full text-sm border-dashed border-gray-300 dark:border-gray-600 dark:text-gray-300"
              >
                {showAllTurns ? "Hide" : "Show"} {remainingTurns.length}{" "}
                additional message{remainingTurns.length > 1 ? "s" : ""}
              </Button>

              {/* Additional turns - only shown when expanded */}
              {showAllTurns && (
                <div className="space-y-4 mt-4 border-t pt-4 dark:border-gray-600">
                  {remainingTurns.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md ${
                        message.role === "system"
                          ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                          : message.role === "user"
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                          : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      }`}
                    >
                      <Badge
                        variant="outline"
                        className={`${
                          message.role === "system"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100"
                            : message.role === "user"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                            : "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                        } mb-2 text-xs`}
                      >
                        {message.role === "system"
                          ? "System"
                          : message.role === "user"
                          ? "User"
                          : "Assistant"}
                        {message.role === "assistant" &&
                        remainingTurns.filter((m) => m.role === "assistant")
                          .length > 1
                          ? ` (Turn ${Math.floor(index / 2) + 2})`
                          : ""}
                      </Badge>
                      <MarkdownRenderer content={message.content} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this dataset item? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(dataset.id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AccordionItem>
  );
}
