// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Data } from "./use-data";
import apiClient from "@/lib/axios-client";

export interface ToolMessage {
  role: "tools";
  content: string;
}

export interface GenerationMetadata {
  status: string;
  isCancel: boolean;
  total_page: number;
  total_files: number;
  current_page: number;
  processed_files: number;
}

// Dataset interfaces based on backend models
export interface Dataset {
  id: number;
  name: string;
  prompt_template: string;
  generation_metadata?: GenerationMetadata;
  created_date?: string;
  modified_date?: string;
  tools?: ToolMessage[];
  project_id: number;
}

export interface CreateDatasetData {
  name: string;
  prompt_template: string;
  project_id: string;
  tools?: ToolMessage[];
}

export interface UpdateDatasetData {
  name?: string;
  prompt_template?: string;
  tools?: ToolMessage[];
}

export interface TextEmbeddingSource {
  name: string;
  count: number;
}

export interface TextEmbeddingProps {
  num_embeddings: number;
  doc_chunks: TextEmbedding[];
  current_page: number;
  total_pages: number;
}

export interface TextEmbedding {
  ids: string;
  chunk: string;
  source: string;
  page: number;
}

export interface Document {
  id: string;
  name: string;
  source: string;
  pages: number;
  selected?: boolean;
}

export interface ChunkingPreset {
  id: string;
  name: string;
  description: string;
  chunkSize: number;
  chunkOverlap: number;
}

// Query keys for React Query
export const datasetKeys = {
  all: ["datasets"] as const,
  detail: (id: number) => [...datasetKeys.all, id] as const,
  data: (id: number) => [...datasetKeys.detail(id), "data"] as const,
  dataCount: (id: number) => [...datasetKeys.detail(id), "dataCount"] as const,
  ackDataCount: (id: number) =>
    [...datasetKeys.detail(id), "ackDataCount"] as const,
  textEmbedding: (id: number) =>
    [...datasetKeys.detail(id), "textEmbedding"] as const,
  textEmbeddingSources: (id: number) =>
    [...datasetKeys.detail(id), "textEmbeddingSources"] as const,
  generationMetadata: (id: number) =>
    [...datasetKeys.detail(id), "generationMetadata"] as const,
};

// Datasets API
const datasetsApi = {
  // Get all datasets
  getAll: async (): Promise<Dataset[]> => {
    const response = await apiClient.get("/datasets");
    return response.data.data;
  },

  // Get a single dataset by ID
  getById: async (id: number): Promise<Dataset> => {
    const response = await apiClient.get(`/datasets/${id}`);
    return response.data.data;
  },

  // Create a new dataset
  create: async (data: CreateDatasetData): Promise<Dataset> => {
    const response = await apiClient.post("/datasets", data);
    return response.data.data;
  },

  // Update an existing dataset
  update: async (id: number, data: UpdateDatasetData): Promise<Dataset> => {
    const response = await apiClient.patch(`/datasets/${id}`, data);
    return response.data.data;
  },

  // Delete a dataset
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/datasets/${id}`);
  },

  // Get dataset data (conversations/examples)
  getDatasetData: async (
    id: number,
    page?: number,
    pageSize?: number
  ): Promise<Data[]> => {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (pageSize) params.append("pageSize", pageSize.toString());

    const response = await apiClient.get(
      `/datasets/${id}/data?${params.toString()}`
    );
    return response.data.data;
  },

  // Get dataset data count
  getDatasetDataCount: async (id: number): Promise<number> => {
    const response = await apiClient.get(`/datasets/${id}/data/count`);
    return response.data.data;
  },

  // Get acknowledge dataset data count
  getAckDatasetDataCount: async (id: number): Promise<number> => {
    const response = await apiClient.get(
      `/datasets/${id}/data/acknowledge_count`
    );
    return response.data.data;
  },

  // Add data to dataset
  addDataToDataset: async (
    id: number,
    data: Omit<Data, "id" | "dataset_id" | "created_date" | "modified_date">
  ): Promise<Data> => {
    const response = await apiClient.post(`/datasets/${id}/data`, data);
    return response.data.data;
  },

  // Get text embeddings
  getTextEmbedding: async (
    id: number,
    page?: number,
    pageSize?: number,
    source?: string
  ): Promise<TextEmbeddingProps> => {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (pageSize) params.append("pageSize", pageSize.toString());
    if (source) params.append("source", source);

    const response = await apiClient.get(
      `/datasets/${id}/text_embedding?${params.toString()}`
    );
    return response.data.data;
  },

  // Get text embedding sources
  getTextEmbeddingSources: async (id: number): Promise<string[]> => {
    const response = await apiClient.get(
      `/datasets/${id}/text_embedding_sources`
    );
    return response.data.data;
  },

  // Create text embedding
  createTextEmbedding: async (
    id: number,
    files: File[],
    chunkSize: number,
    chunkOverlap: number
  ): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiClient.post(
      `/datasets/${id}/text_embedding?chunk_size=${chunkSize}&chunk_overlap=${chunkOverlap}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.data;
  },

  // Delete text embedding by UUID
  deleteTextEmbeddingByUuid: async (
    id: number,
    uuid: string
  ): Promise<string> => {
    const response = await apiClient.delete(
      `/datasets/${id}/text_embeddings/${uuid}`
    );
    return response.data.data;
  },

  // Delete text embeddings by source
  deleteTextEmbeddingsBySource: async (
    id: number,
    source: string
  ): Promise<string> => {
    const response = await apiClient.delete(
      `/datasets/${id}/text_embeddings/source/${source}`
    );
    return response.data.data;
  },

  // Get generation metadata
  getGenerationMetadata: async (id: number): Promise<GenerationMetadata> => {
    const response = await apiClient.get(`/datasets/${id}/generation_metadata`);
    return response.data.data;
  },
};

// Hook to fetch all datasets
export function useDatasets() {
  return useQuery({
    queryKey: datasetKeys.all,
    queryFn: datasetsApi.getAll,
  });
}

// Hook to fetch a single dataset by ID
export function useDataset(id?: number, refetchInterval?: number) {
  return useQuery({
    queryKey: datasetKeys.detail(id || 0),
    queryFn: () => {
      if (!id) {
        throw new Error("Dataset ID is required");
      }
      return datasetsApi.getById(id);
    },
    enabled: !!id, // Only run the query if an ID is provided
    refetchInterval: refetchInterval || false, // Optional refetch interval
  });
}

// Hook to create a new dataset
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDatasetData) => datasetsApi.create(data),
    onSuccess: () => {
      // Invalidate the datasets list query to refetch
      queryClient.invalidateQueries({ queryKey: datasetKeys.all });
    },
  });
}

// Hook to update a dataset
export function useUpdateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDatasetData }) =>
      datasetsApi.update(id, data),
    onSuccess: (updatedDataset) => {
      // Update both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      queryClient.invalidateQueries({
        queryKey: datasetKeys.detail(updatedDataset.id),
      });
    },
  });
}

// Hook to delete a dataset
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => datasetsApi.delete(id),
    onSuccess: (_data, id) => {
      // Update both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: datasetKeys.all });
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(id) });
    },
  });
}

// Hook to fetch dataset data (examples/conversations)
export function useDatasetData(id: number, page?: number, pageSize?: number) {
  return useQuery({
    queryKey: [...datasetKeys.data(id), page, pageSize],
    queryFn: () => datasetsApi.getDatasetData(id, page, pageSize),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

// Hook to fetch dataset data count
export function useDatasetDataCount(id: number) {
  return useQuery({
    queryKey: datasetKeys.dataCount(id),
    queryFn: () => datasetsApi.getDatasetDataCount(id),
    enabled: !!id,
    staleTime: 0,
  });
}

// Hook to fetch dataset data count
export function useAckDatasetDataCount(id: number) {
  return useQuery({
    queryKey: datasetKeys.ackDataCount(id),
    queryFn: () => datasetsApi.getAckDatasetDataCount(id),
    enabled: !!id,
    staleTime: 0,
  });
}

// Hook to add data to a dataset
export function useAddDataToDataset(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<Data, "id" | "dataset_id" | "created_date" | "modified_date">
    ) => datasetsApi.addDataToDataset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.data(id) });
      queryClient.invalidateQueries({ queryKey: datasetKeys.dataCount(id) });
    },
  });
}

// Hook to fetch text embeddings
export function useTextEmbedding(
  id: number,
  page?: number,
  pageSize?: number,
  source?: string
) {
  return useQuery({
    queryKey: [...datasetKeys.textEmbedding(id), page, pageSize, source],
    queryFn: () => datasetsApi.getTextEmbedding(id, page, pageSize, source),
    enabled: !!id,
  });
}

// Hook to fetch text embedding sources
export function useTextEmbeddingSources(id: number) {
  return useQuery({
    queryKey: datasetKeys.textEmbeddingSources(id),
    queryFn: () => datasetsApi.getTextEmbeddingSources(id),
    enabled: !!id,
  });
}

// Hook to create text embeddings
export function useCreateTextEmbedding(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      chunkSize,
      chunkOverlap,
    }: {
      files: File[];
      chunkSize: number;
      chunkOverlap: number;
    }) => {
      if (!id) {
        throw new Error("Dataset ID is required");
      }
      return datasetsApi.createTextEmbedding(
        id,
        files,
        chunkSize,
        chunkOverlap
      );
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.textEmbedding(id),
        });
        queryClient.invalidateQueries({
          queryKey: datasetKeys.textEmbeddingSources(id),
        });
      }
    },
  });
}

// Hook to delete text embedding by UUID
export function useDeleteTextEmbeddingByUuid(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => {
      if (!id) {
        throw new Error("Dataset ID is required");
      }
      return datasetsApi.deleteTextEmbeddingByUuid(id, uuid);
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.textEmbedding(id),
        });
        queryClient.invalidateQueries({
          queryKey: datasetKeys.textEmbeddingSources(id),
        });
      }
    },
  });
}

// Hook to delete text embeddings by source
export function useDeleteTextEmbeddingsBySource(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (source: string) => {
      if (!id) {
        throw new Error("Dataset ID is required");
      }
      return datasetsApi.deleteTextEmbeddingsBySource(id, source);
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.textEmbedding(id),
        });
        queryClient.invalidateQueries({
          queryKey: datasetKeys.textEmbeddingSources(id),
        });
      }
    },
  });
}

// Hook to fetch generation metadata
export function useGenerationMetadata(id?: number) {
  return useQuery({
    queryKey: datasetKeys.generationMetadata(id || 0),
    queryFn: () => {
      if (!id) {
        throw new Error("Dataset ID is required");
      }
      return datasetsApi.getGenerationMetadata(id);
    },
    enabled: !!id,
  });
}
