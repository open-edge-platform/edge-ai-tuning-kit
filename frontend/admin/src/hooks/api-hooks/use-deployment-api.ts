// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { createDeploymentAPI, deleteDeploymentAPI } from '@/api/deployment';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { type APIResponse } from '@/types/api';
import { type CreateDeploymentProps } from '@/types/deployment';

export const useCreateDeployment = (): UseMutationResult<APIResponse, Error, { data: CreateDeploymentProps }> => {
  return useMutation({
    mutationFn: async ({ data }: { data: CreateDeploymentProps }) => {
      return await createDeploymentAPI(data);
    },
  });
};

export const useDeleteDeployment = (): UseMutationResult<APIResponse, Error, { id: number }> => {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return await deleteDeploymentAPI(id);
    },
  });
};