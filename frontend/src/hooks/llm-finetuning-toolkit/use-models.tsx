// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios-client";

export interface Model {
  id: number;
  model_id: string;
  model_dir: string;
  description: string;
  is_downloaded: boolean;
  model_metadata: {
    model_type: string;
    model_revision: string;
    is_custom_model: boolean;
  };
  download_metadata: {
    download_task_id: string | null;
    progress: number;
    status: "UNAVAILABLE" | "PENDING" | "DOWNLOADING" | "SUCCESS" | "FAILURE";
  };
  created_date: string;
  modified_date: string;
}

export interface CreateModelPayload {
  model_id: string;
  model_revision: string;
  model_description?: string;
  model_type: string;
}

// Query keys for React Query
export const modelKeys = {
  all: ["models"] as const,
  detail: (id: number) => [...modelKeys.all, id] as const,
  supported: ["supportedModels"] as const,
};

// Models API
const modelsApi = {
  // Get all models
  getAll: async (): Promise<Model[]> => {
    const response = await apiClient.get("/models");
    return response.data.data;
  },

  // Get a single model by ID
  getById: async (id: number): Promise<Model> => {
    const response = await apiClient.get(`/models/${id}`);
    return response.data.data;
  },

  // Create a new model
  create: async (data: CreateModelPayload): Promise<Model> => {
    const response = await apiClient.post("/models", data);
    return response.data.data;
  },

  // Update an existing model
  update: async (id: number, data: Partial<Model>): Promise<Model> => {
    const response = await apiClient.patch(`/models/${id}`, data);
    return response.data.data;
  },

  // Delete a model
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/models/${id}`);
  },

  // Download a model
  download: async (id: number): Promise<Model> => {
    const response = await apiClient.post(`/models/download/${id}`);
    return response.data.data;
  },

  // Stop downloading a model
  stopDownload: async (id: number): Promise<Model> => {
    const response = await apiClient.post(`/models/stop_download/${id}`);
    return response.data.data;
  },
};

export function useModels(options = { refetchInterval: 5000 }) {
  return useQuery({
    queryKey: modelKeys.all,
    queryFn: modelsApi.getAll,
    refetchInterval: options.refetchInterval, // Poll every 5 seconds by default
  });
}

export function useModel(id: number) {
  return useQuery({
    queryKey: modelKeys.detail(id),
    queryFn: () => modelsApi.getById(id),
    enabled: !!id, // Only run the query if id is provided
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateModelPayload) => modelsApi.create(data),
    onSuccess: () => {
      // Invalidate the models query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Model> }) =>
      modelsApi.update(id, data),
    onSuccess: (updatedModel) => {
      // Invalidate specific model query and the models list
      queryClient.invalidateQueries({
        queryKey: modelKeys.detail(updatedModel.id),
      });
      queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => modelsApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: modelKeys.all });
      queryClient.invalidateQueries({ queryKey: modelKeys.detail(id) });
    },
  });
}

export function useDownloadModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => modelsApi.download(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: modelKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });
}

export function useStopDownloadModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => modelsApi.stopDownload(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: modelKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: modelKeys.all });
    },
  });
}
