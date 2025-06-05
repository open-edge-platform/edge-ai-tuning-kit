// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import {
  downloadModelAPI,
  getModelIdAPI,
  prepareModelAPI,
  startInferenceServiceAPI,
  stopInferenceServiceAPI,
} from '@/api/services';
import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { type APIResponse } from '@/types/api';

export function useGetModelIDInterval(enable: boolean, endpoint?: string): UseQueryResult<string> {
  return useQuery({
    queryKey: ['models', endpoint],
    queryFn: async () => {
      const response = await getModelIdAPI();
      return (((response.data as Record<string, any[]>).data[0] as Record<string, any>).id as string) ?? null;
    },
    refetchInterval: enable ? 1000 : false,
  });
}

export const useDownloadModel = (): UseMutationResult<APIResponse, Error, { id: number }> => {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return await downloadModelAPI(id);
    },
  });
};

export const usePrepareModel = (): UseMutationResult<APIResponse, Error, { id: number }> => {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return await prepareModelAPI(id);
    },
  });
};

export const useStartInferenceService = (): UseMutationResult<APIResponse, Error, { id: number, device?: string }> => {
  return useMutation({
    mutationFn: async ({ id, device = 'cpu' }: { id: number, device?: string }) => {
      return await startInferenceServiceAPI(id, device);
    },
  });
};

export const useStopInferenceService = (): UseMutationResult<APIResponse, Error, { id: number }> => {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return await stopInferenceServiceAPI(id);
    },
  });
};
