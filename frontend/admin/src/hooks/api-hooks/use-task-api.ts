// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import {
  createTaskAPI,
  deleteTaskAPI,
  restartTaskAPI,
  getTaskByIDAPI,
  getTasksByProjectIDAPI,
  updateInferenceConfigsAPI,
  getRunningTaskAPI,
} from '@/api/tasks';
import { handleAPIResponse } from '@/utils/common';
import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { type APIResponse } from '@/types/api';
import {
  type CreateTaskProps,
  type TaskProps,
  type UpdateInferenceConfigProps,
} from '@/types/task';

export const useGetRunningTask = (): UseQueryResult<TaskProps> => {
  return useQuery({
    queryKey: ['running_task'],
    queryFn: async () => {
      const response = await getRunningTaskAPI();
      const result = handleAPIResponse<TaskProps>(response);

      return result ?? null;
    },
  });
};

export const useGetTaskByID = (id: number): UseQueryResult<TaskProps> => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const response = await getTaskByIDAPI(id);
      const result = handleAPIResponse<TaskProps>(response);

      return result ?? null;
    },
  });
};

export const useGetTaskByIDInterval = (id: number): UseQueryResult<TaskProps> => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const response = await getTaskByIDAPI(id);
      const result = handleAPIResponse<TaskProps>(response);
      return result ?? null;
    },
    refetchInterval: 5000,
  });
};

export const useGetTaskByProjectIDInterval = (id: number): UseQueryResult<TaskProps[]> => {
  return useQuery({
    queryKey: ['project', id, 'tasks'],
    queryFn: async () => {
      const response = await getTasksByProjectIDAPI(id, 0);
      const result = handleAPIResponse<TaskProps[]>(response);

      return result ?? null;
    },
    refetchInterval: 1000,
  });
};

export const useCreateTask = (): UseMutationResult<APIResponse, Error, { data: CreateTaskProps }> => {
  return useMutation({
    mutationFn: async ({ data }: { data: CreateTaskProps }) => {
      return await createTaskAPI(data);
    },
  });
};

export const useUpdateInferenceConfigs = (): UseMutationResult<
  APIResponse,
  Error,
  { id: number; data: UpdateInferenceConfigProps }
> => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateInferenceConfigProps }) => {
      return await updateInferenceConfigsAPI(id, data);
    },
  });
};

export const useRestartTask = (): UseMutationResult<APIResponse, Error, { id: number }> => {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return await restartTaskAPI(id);
    }
  })
};

export const useDeleteTask = (): UseMutationResult<APIResponse, Error, { id: number }> => {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return await deleteTaskAPI(id);
    },
  });
};
