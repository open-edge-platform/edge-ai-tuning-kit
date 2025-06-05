// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import {
  createTextEmbeddingsAPI,
  deleteTextEmbeddingBySourceAPI,
  deleteTextEmbeddingByUUIDAPI,
  getDatasetGenerationMetadataAPI,
  updateDatasetAPI,
} from '@/api/datasets';
import { handleAPIResponse } from '@/utils/common';
import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { type APIResponse } from '@/types/api';
import { type CreateTextBeddingsProps, type GenerationMetadata, type UpdateDatasetProps } from '@/types/dataset';

export function useDatasetGenerationMetadata(id: number, enabled = true): UseQueryResult<GenerationMetadata> {
  return useQuery({
    queryKey: ['dataset', id, 'generation_metadata'],
    queryFn: async () => {
      const response = await getDatasetGenerationMetadataAPI(id);
      const result = handleAPIResponse<GenerationMetadata>(response);

      return result ?? null;
    },
    refetchInterval: 5000,
    enabled
  });
}

export const useCreateTextEmbeddings = (): UseMutationResult<APIResponse, Error, CreateTextBeddingsProps> => {
  return useMutation({
    mutationFn: async ({ id, chunkSize, chunkOverlap, data }: CreateTextBeddingsProps) => {
      return await createTextEmbeddingsAPI(id, chunkSize, chunkOverlap, data);
    },
  });
};

export const useUpdateDataset = (): UseMutationResult<APIResponse, Error, { id: number; data: UpdateDatasetProps }> => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateDatasetProps }) => {
      return await updateDatasetAPI(id, data);
    },
  });
};

export const useDeleteTextEmbeddingByUUID = (): UseMutationResult<APIResponse, Error, { id: number; uuid: string }> => {
  return useMutation({
    mutationFn: async ({ id, uuid }: { id: number; uuid: string }) => {
      return await deleteTextEmbeddingByUUIDAPI(id, uuid);
    },
  });
};

export const useDeleteTextEmbeddingBySource = (): UseMutationResult<
  APIResponse,
  Error,
  { id: number; source: string }
> => {
  return useMutation({
    mutationFn: async ({ id, source }: { id: number; source: string }) => {
      return await deleteTextEmbeddingBySourceAPI(id, source);
    },
  });
};
