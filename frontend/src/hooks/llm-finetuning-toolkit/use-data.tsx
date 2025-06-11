// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios-client";

// Data interfaces based on backend models
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface Data {
  id: number;
  raw_data: { messages: ChatMessage[]; };
  isGenerated: boolean;
  created_date?: string;
  modified_date?: string;
  dataset_id: number;
}

export interface CreateDataFromFileIdRequest {
  file_id: number;
  dataset_id: number;
}

export interface GenerateQARequest {
  dataset_id: number;
  project_type: string;
  num_generations?: number;
  files?: File[];
}

export interface GenerateDocumentQARequest {
  dataset_id: number;
  source_filename: string;
  project_type: string;
  num_generations?: number;
}

export interface UpdateDataRequest {
  raw_data?: { messages: ChatMessage[]; };
  isGenerated?: boolean;
}

// Query keys for React Query
export const dataKeys = {
  all: ["data"] as const,
  detail: (id: number) => [...dataKeys.all, id] as const,
  byDataset: (datasetId: number) =>
    [...dataKeys.all, "byDataset", datasetId] as const,
};

// Data API
const dataApi = {
  // Get all data
  getAll: async (): Promise<Data[]> => {
    const response = await apiClient.get("/data");
    return response.data;
  },

  // Create data from file ID
  createFromFileId: async (data: CreateDataFromFileIdRequest) => {
    const response = await apiClient.post("/data/create_from_file_id", data);
    return response.data;
  },

  // Upload files for data creation
  uploadFile: async (datasetId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiClient.post(
      `/data/upload_file/${datasetId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Generate QA from files
  generateQA: async ({
    dataset_id,
    project_type,
    num_generations = 5,
    files = [],
  }: GenerateQARequest) => {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiClient.post(
      `/data/generate_qa?dataset_id=${dataset_id}&project_type=${project_type}&num_generations=${num_generations}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Generate document QA
  generateDocumentQA: async ({
    dataset_id,
    source_filename,
    project_type,
    num_generations = 5,
  }: GenerateDocumentQARequest) => {
    const response = await apiClient.post(
      `/data/generate_document_qa?dataset_id=${dataset_id}&source_filename=${source_filename}&project_type=${project_type}&num_generations=${num_generations}`,
      {}
    );
    return response.data;
  },

  // Stop data generation
  stopDataGeneration: async (id: number) => {
    const response = await apiClient.post(`/data/stop_data_generation/${id}`);
    return response.data;
  },

  // Update data
  update: async (id: number, data: UpdateDataRequest) => {
    const response = await apiClient.patch(`/data/${id}`, data);
    return response.data;
  },

  // Delete data
  delete: async (id: number) => {
    const response = await apiClient.delete(`/data/${id}`);
    return response.data;
  },

  // Delete all data
  deleteAll: async () => {
    const response = await apiClient.delete("/data/delete_all");
    return response.data;
  },
};

// Hook to fetch all data
export function useData() {
  return useQuery({
    queryKey: dataKeys.all,
    queryFn: dataApi.getAll,
  });
}

// Hook to create data from file ID
export function useCreateDataFromFileId() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDataFromFileIdRequest) =>
      dataApi.createFromFileId(data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: dataKeys.all });
      queryClient.invalidateQueries({
        queryKey: dataKeys.byDataset(variables.dataset_id),
      });
    },
  });
}

// Hook to upload file for data creation
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ datasetId, files }: { datasetId: number; files: File[] }) =>
      dataApi.uploadFile(datasetId, files),
    onSuccess: (_result, variables) => {
      // Invalidate data queries
      queryClient.invalidateQueries({ queryKey: dataKeys.all });
      queryClient.invalidateQueries({
        queryKey: dataKeys.byDataset(variables.datasetId),
      });

      // Also invalidate dataset queries to ensure the UI is fully updated
      queryClient.invalidateQueries({
        queryKey: ["datasets"],
      });
      queryClient.invalidateQueries({
        queryKey: ["datasets", variables.datasetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["datasets", variables.datasetId, "data"],
      });
      queryClient.invalidateQueries({
        queryKey: ["datasets", variables.datasetId, "dataCount"],
      });
    },
  });
}

// Hook to generate QA from files
export function useGenerateQA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GenerateQARequest) => dataApi.generateQA(params),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: dataKeys.all });
      queryClient.invalidateQueries({
        queryKey: dataKeys.byDataset(variables.dataset_id),
      });
    },
  });
}

// Hook to generate document QA
export function useGenerateDocumentQA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GenerateDocumentQARequest) =>
      dataApi.generateDocumentQA(params),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: dataKeys.all });
      queryClient.invalidateQueries({
        queryKey: dataKeys.byDataset(variables.dataset_id),
      });
    },
  });
}

// Hook to stop data generation
export function useStopDataGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => dataApi.stopDataGeneration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.all });
    },
  });
}

// Hook to update data
export function useUpdateData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDataRequest }) =>
      dataApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.all });
    },
  });
}

// Hook to delete data
export function useDeleteData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => dataApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.all });
    },
  });
}

// Hook to delete all data
export function useDeleteAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dataApi.deleteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.all });
    },
  });
}
