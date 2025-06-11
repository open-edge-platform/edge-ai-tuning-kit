// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DocumentChunksPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DocumentChunksPagination({
  currentPage,
  totalPages,
  onPageChange,
}: DocumentChunksPaginationProps) {
  // Function to generate pages array with ellipsis
  const getVisiblePages = () => {
    // Handle edge case of no pages
    if (totalPages <= 0) {
      return [];
    }

    // Show all pages if total pages <= 5
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first and last page
    const result = [];
    result.push(1);

    // Calculate middle range
    let startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, startPage + 2);

    // Adjust if at the end
    if (endPage === totalPages - 1) {
      startPage = Math.max(2, endPage - 2);
    }

    if (startPage > 2) {
      result.push("ellipsis-start");
    }

    for (let i = startPage; i <= endPage; i++) {
      result.push(i);
    }

    if (endPage < totalPages - 1) {
      result.push("ellipsis-end");
    }

    result.push(totalPages);

    return result;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center space-x-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <span className="sr-only">Previous page</span>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {visiblePages.map((page, index) => {
        if (page === "ellipsis-start" || page === "ellipsis-end") {
          return (
            <span
              key={`${page}-${index}`}
              className="px-2 text-gray-500 dark:text-gray-400"
            >
              ...
            </span>
          );
        }

        return (
          <Button
            key={`page-${page}`}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page as number)}
            className={`h-8 w-8 p-0 ${
              currentPage === page
                ? "dark:bg-blue-600"
                : "dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            }`}
          >
            {page}
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <span className="sr-only">Next page</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
