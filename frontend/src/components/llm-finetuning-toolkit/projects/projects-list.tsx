// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Project } from "@/hooks/llm-finetuning-toolkit/use-projects";
import { formatDistance } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ProjectsListProps {
  limit?: number;
  projects?: Project[];
  isLoading?: boolean;
  error?: Error | null;
  onEdit?: (project: Project) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
  layout?: "grid" | "row";
}

export function ProjectsList({
  limit,
  projects = [],
  isLoading = false,
  error = null,
  onEdit,
  onDelete,
  isDeleting = false,
  layout = "grid",
}: ProjectsListProps) {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Apply pagination
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const displayProjects = projects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete && onDelete) {
      onDelete(projectToDelete.id);
    }
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const gridLayout = "grid grid-cols-1 md:grid-cols-2 gap-6";
  const rowLayout = "flex flex-col space-y-4";

  if (isLoading) {
    return (
      <Card className={layout === "grid" ? "col-span-2" : ""}>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Loading projects...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={layout === "grid" ? "col-span-2" : ""}>
        <CardContent className="pt-6 text-center">
          <p className="text-red-500">
            Error loading projects: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(value) => setItemsPerPage(Number(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Items per page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 items per page</SelectItem>
            <SelectItem value="10">10 items per page</SelectItem>
            <SelectItem value="20">20 items per page</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={layout === "grid" ? gridLayout : rowLayout}>
        {displayProjects.length === 0 ? (
          <Card className={layout === "grid" ? "col-span-2" : ""}>
            <CardContent className="pt-6 flex flex-col items-center justify-center py-10">
              <div className="rounded-full bg-muted p-3 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground h-6 w-6"
                >
                  <rect width="8" height="14" x="8" y="5" rx="1" />
                  <path d="M4 5h4" />
                  <path d="M4 9h4" />
                  <path d="M4 13h4" />
                  <path d="M4 17h4" />
                </svg>
              </div>
              <h3 className="font-medium text-base mb-1">No projects found</h3>
              <p className="text-muted-foreground text-sm max-w-md text-center">
                Create a new project to start fine-tuning your models and manage your AI workflows.
              </p>
            </CardContent>
          </Card>
        ) : (
          displayProjects.map((project) => (
            <Link
              href={`/llm-finetuning-toolkit/projects/${project.id}`}
              key={project.id}
              className="block"
            >
              <Card className="relative border border-border overflow-hidden hover:border-blue-500 transition-all duration-300 ease-in-out hover:shadow-md dark:hover:shadow-primary/20 group h-full">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-2 h-8 bg-primary/80 rounded-sm"></div>
                        <h3 className="font-semibold text-lg md:text-xl tracking-tight leading-tight text-primary">
                          {project.name}
                        </h3>
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 pl-4 border-l-2 border-primary/20">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        {onEdit && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onEdit(project);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={(e) => handleDelete(e, project)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                            disabled={isDeleting}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isDeleting && projectToDelete?.id === project.id ? "Deleting..." : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Tasks count with visual enhancement */}
                    {project.tasks && (
                      <div className="text-sm bg-primary/10 px-3 py-1.5 rounded-md inline-flex items-center">
                        <span className="font-medium">{project.tasks.length}</span>
                        <span className="text-muted-foreground ml-1">Tasks</span>
                      </div>
                    )}
                    
                    {/* Add a badge for creation date */}
                    {project.created_date && (
                      <div className="text-sm bg-muted px-3 py-1.5 rounded-md inline-flex items-center">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="font-medium ml-1">
                          {new Date(project.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer with improved visuals */}
                  <div className="mt-auto pt-4 flex justify-between text-xs border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <span className="inline-block h-2 w-2 rounded-full bg-primary mr-1"></span>
                        <span className="text-muted-foreground">Created </span>
                        <span className="font-medium ml-1">
                          {project.created_date &&
                            formatDistance(new Date(project.created_date), new Date(), {
                              addSuffix: true,
                            })}
                        </span>
                      </div>
                    </div>
                    {project.modified_date && (
                      <div className="flex items-center">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1"></span>
                        <span className="text-muted-foreground">Updated </span>
                        <span className="font-medium ml-1">
                          {formatDistance(new Date(project.modified_date), new Date(), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
        {limit && projects && projects.length > limit && (
          <div
            className={cn(
              "flex justify-center mt-4",
              layout === "grid" ? "col-span-2" : ""
            )}
          >
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">View All Projects</Link>
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the project - {projectToDelete?.name}? 
              This action cannot be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
