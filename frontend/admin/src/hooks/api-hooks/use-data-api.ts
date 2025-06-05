// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { createDataAPI, deleteDataAPI, updateDataAPI, generateDocumentDatasetAPI, uploadDocumentAPI, uploadJsonDataAPI } from '@/api/data';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { type APIResponse } from '@/types/api';
import { type CreateDataProps, type DataProps } from '@/types/data';

export const useCreateData = (): UseMutationResult<APIResponse, Error, { id: number; data: CreateDataProps }> => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateDataProps }) => {
      return await createDataAPI(id, data);
    },
  });
};

export const useDocumentDatasetGeneration = (): UseMutationResult<
  APIResponse,
  Error,
  {
    params: {
      dataset_id: number;
      source_filename: string;
      project_type: string;
      num_generations: number;
    }
  }
> => {
  return useMutation({
    mutationFn: async ({
      params,
    }: {
      params: {
        dataset_id: number;
        source_filename: string;
        project_type: string;
        num_generations: number;
      }
    }) => {
      return await generateDocumentDatasetAPI(params);
    },
  });
};

export const useUploadDocument = (): UseMutationResult<
  APIResponse,
  Error,
  {
    params: {
      dataset_id: string;
      project_type: string;
    };
    data: FormData;
  }
> => {
  return useMutation({
    mutationFn: async ({
      params,
      data,
    }: {
      params: {
        dataset_id: string;
        project_type: string;
      };
      data: FormData;
    }) => {
      return await uploadDocumentAPI(params, data);
    },
  });
};

export const useUploadJsonData = (): UseMutationResult<
  APIResponse,
  Error,
  {
    id: string;
    data: FormData;
  }
> => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      return await uploadJsonDataAPI(id, data);
    },
  });
};

export const useUpdateData = (): UseMutationResult<APIResponse, Error, { id: number; data: DataProps }> => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DataProps }) => {
      return await updateDataAPI(id, data);
    },
  });
};

export const useDeleteData = (): UseMutationResult<APIResponse, Error, { id: number }> => {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return await deleteDataAPI(id);
    },
  });
};
