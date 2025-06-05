// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import { getModelsAPI } from '@/api/model';
import { handleAPIResponse } from '@/utils/common';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { type ModelProps } from '@/types/model';

export const useGetModelsInterval = (refetchInterval = 0): UseQueryResult<ModelProps[]> => {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const response = await getModelsAPI();
      const result = handleAPIResponse<ModelProps[]>(response);

      return result ?? [];
    },
    refetchInterval,
  });
};
