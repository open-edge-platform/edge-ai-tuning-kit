// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Trash2,
  Edit,
  ThumbsUp,
  ThumbsDown,
  CheckSquare,
  Square,
} from "lucide-react";
import type { DatasetEntry } from "./types";
import { formatTimeAgo } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DatasetTableProps {
  entries: DatasetEntry[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeQualityFilter: "all" | "high" | "medium" | "low";
  onQualityFilterChange: (filter: "all" | "high" | "medium" | "low") => void;
  onDeleteEntry: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
}

export function DatasetTable({
  entries,
  searchQuery,
  onSearchChange,
  activeQualityFilter,
  onQualityFilterChange,
  onDeleteEntry,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
}: DatasetTableProps) {
  const getQualityBadge = (quality: DatasetEntry["quality"]) => {
    switch (quality) {
      case "high":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            High Quality
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
            Medium
          </Badge>
        );
      case "low":
        return <Badge variant="destructive">Low Quality</Badge>;
    }
  };

  const selectedCount = entries.filter((entry) => entry.selected).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dataset..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Tabs
            value={activeQualityFilter}
            onValueChange={(value) =>
              onQualityFilterChange(value as "all" | "high" | "medium" | "low")
            }
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="high">High</TabsTrigger>
              <TabsTrigger value="medium">Medium</TabsTrigger>
              <TabsTrigger value="low">Low</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-muted p-2 rounded-md">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Selection
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onSelectAll}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Select All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDeselectAll}>
                  <Square className="mr-2 h-4 w-4" />
                  Deselect All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteSelected}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">
                <Checkbox
                  checked={
                    entries.length > 0 &&
                    entries.every((entry) => entry.selected)
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectAll();
                    } else {
                      onDeselectAll();
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-[250px]">User Message</TableHead>
              <TableHead className="w-[350px]">Assistant Message</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No dataset entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox
                      checked={entry.selected}
                      onCheckedChange={() => onToggleSelection(entry.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="line-clamp-2">{entry.userMessage}</div>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-2">{entry.assistantMessage}</div>
                  </TableCell>
                  <TableCell>{entry.source}</TableCell>
                  <TableCell>{getQualityBadge(entry.quality)}</TableCell>
                  <TableCell>{formatTimeAgo(entry.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ThumbsUp className="h-4 w-4" />
                        <span className="sr-only">Mark as good</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ThumbsDown className="h-4 w-4" />
                        <span className="sr-only">Mark as bad</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDeleteEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {entries.length} entries
      </div>
    </div>
  );
}
