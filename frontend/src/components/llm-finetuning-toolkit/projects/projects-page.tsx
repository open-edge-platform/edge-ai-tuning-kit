// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/llm-finetuning-toolkit/dashboard/dashboard-header";
import { ProjectsList } from "@/components/llm-finetuning-toolkit/projects/projects-list";
import { ProjectFormDialog } from "@/components/llm-finetuning-toolkit/projects/project-dialog";
import {
  useProjects,
  useDeleteProject,
  Project,
} from "@/hooks/llm-finetuning-toolkit/use-projects";
import { useModels } from "@/hooks/llm-finetuning-toolkit/use-models";
import { Input } from "@/components/ui/input";
import {
  LoadingPlaceholder,
  ErrorPlaceholder,
  EmptyPlaceholder,
} from "@/components/llm-finetuning-toolkit/common/placeholder";

export function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Query and mutation hooks
  const { data: projects = [], isLoading, isError } = useProjects();
  const { data: models = [], isLoading: isLoadingModels, isError: isModelsError } = useModels();
  const deleteProjectMutation = useDeleteProject();

  // Check if there are any downloaded models
  const hasDownloadedModels = models.some(model => model.is_downloaded === true);

  const handleNewProject = () => {
    setSelectedProject(null);
    setOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    // If dialog is closing and we're not keeping the selected project
    if (!isOpen) {
      // Clear the selected project after a small delay to avoid UI flicker
      setTimeout(() => setSelectedProject(null), 300);
    }
  };

  const handleDeleteProject = (id: number) => {
    deleteProjectMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Project deleted successfully");
      },
      onError: (error) => {
        toast.error(`Error deleting project: ${error.message}`);
      },
    });
  };

  // Filter projects based on search term
  const filteredProjects =
    searchTerm.trim() === ""
      ? projects
      : projects.filter((project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

  return (
    <>
      <DashboardHeader
        heading="Projects"
        text="Manage your fine-tuning projects"
      >
        <Button
          onClick={handleNewProject}
          className={`${
            isLoading || isError || !hasDownloadedModels
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={isLoading || isError || !hasDownloadedModels || isLoadingModels || isModelsError}
          title={
            isLoading
              ? "Loading projects..."
              : isError
              ? "Failed to load projects"
              : !hasDownloadedModels
              ? "Download a model before creating a project"
              : "Create a new project"
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </DashboardHeader>

      <div className="mt-6 flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects by name"
            className="w-full pl-9 pr-4"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <LoadingPlaceholder message="Loading projects..." />
        ) : isError ? (
          <ErrorPlaceholder 
            title="Unable to load projects"
            message="There was a problem connecting to the server. Please try again later."
            onRetry={() => window.location.reload()}
          />
        ) : filteredProjects.length === 0 ? (
          searchTerm.trim() !== "" ? (
            <EmptyPlaceholder 
              icon={Search}
              title="No matching projects"
              description={`No projects found matching '${searchTerm}'. Try a different search term.`}
              action={
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyPlaceholder 
              icon={Plus}
              title="No projects available"
              description={
                hasDownloadedModels 
                  ? "Create your first project to get started with fine-tuning."
                  : "You need to download at least one model before creating a project."
              }
              action={
                <Button onClick={handleNewProject} disabled={!hasDownloadedModels}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              }
            />
          )
        ) : (
          <ProjectsList
            projects={filteredProjects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            isDeleting={deleteProjectMutation.isPending}
            layout="row"
          />
        )}
      </div>

      <ProjectFormDialog
        open={open}
        onOpenChange={handleOpenChange}
        project={selectedProject}
      />
    </>
  );
}
