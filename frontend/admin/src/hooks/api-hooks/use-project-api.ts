// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import { createProjectAPI, deleteProjectAPI } from '@/api/projects';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { type APIResponse } from '@/types/api';
import { type CreateProjectProps } from '@/types/projects';

export const useCreateProject = (): UseMutationResult<APIResponse, Error, { data: CreateProjectProps }> => {
  return useMutation({
    mutationFn: async ({ data }: { data: CreateProjectProps }) => {
      return await createProjectAPI(data);
    },
  });
};

export const useDeleteProject = (): UseMutationResult<APIResponse, Error, { id: number }> => {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return await deleteProjectAPI(id);
    },
  });
};
