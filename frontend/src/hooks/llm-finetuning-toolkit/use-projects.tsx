// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios-client";
import { useState } from "react";
import type { Task } from "./use-tasks";
import type { Dataset } from "./use-datasets";

// Project interfaces based on backend models
export interface Project {
  id: number;
  name: string;
  description?: string;
  created_date?: string;
  modified_date?: string;
  tasks?: Task[];
  dataset?: Dataset;
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectData {
  name: string;
  description?: string;
}

// Query keys for React Query
export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: number) => [...projectKeys.all, id] as const,
};

// Projects API
const projectsApi = {
  // Get all projects
  getAll: async (): Promise<Project[]> => {
    const response = await apiClient.get("/projects");
    return response.data.data;
  },

  // Get a single project by ID
  getById: async (id: number): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data.data;
  },

  // Create a new project
  create: async (data: CreateProjectData): Promise<Project> => {
    const response = await apiClient.post("/projects", data);
    return response.data.data;
  },

  // Update an existing project
  update: async (id: number, data: UpdateProjectData): Promise<Project> => {
    const response = await apiClient.patch(`/projects/${id}`, data);
    return response.data.data;
  },

  // Delete a project
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};

// Enhanced hook to fetch all projects with better sidebar integration
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([] as Project[]);

  // Fetch projects from API
  const query = useQuery({
    queryKey: projectKeys.all,
    queryFn: projectsApi.getAll,
  });

  // Function to add a new project (used by the sidebar)
  const addProject = (project: CreateProjectData) => {
    const newProject = {
      id: Math.max(0, ...projects.map((p) => p.id)) + 1,
      name: project.name,
      description: project.description || "",
      created_date: new Date().toISOString(),
      modified_date: new Date().toISOString(),
    };

    setProjects([...projects, newProject]);
    return projectsApi.create(project);
  };

  return {
    ...query,
    projects, // Provide projects directly
    addProject, // Add project function for sidebar
  };
}

// Hook to fetch a single project by ID
export function useProject(id: number) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id, // Only run the query if an ID is provided
  });
}

// Hook to create a new project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectData) => projectsApi.create(data),
    onSuccess: () => {
      // Invalidate the projects list query to refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

// Hook to update a project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectData }) =>
      projectsApi.update(id, data),
    onSuccess: (updatedProject) => {
      // Update both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(updatedProject.id),
      });
    },
  });
}

// Hook to delete a project
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: (_data, id) => {
      // Update both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}
