// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use server';

import { revalidateTag } from 'next/cache';
import { API } from '@/utils/api';

import { type APIResponse } from '@/types/api';
import { type CreateModelProps } from '@/types/models';

export const getModelsAPI = async (): Promise<APIResponse> => {
  const url = `models`;
  const response = await API.get(url, { revalidate: 0 });
  return response;
};

export const downloadModelAPI = async (id: number): Promise<APIResponse> => {
  const response = await API.post(`models/download/${id}`);
  return response;
};

export const stopDownloadModelAPI = async (id: number): Promise<APIResponse> => {
  const response = await API.post(`models/stop_download/${id}`);
  return response;
};

export const createModelAPI = async (data: CreateModelProps): Promise<APIResponse> => {
  const response = await API.post('models', data);
  revalidateTag('models');
  return response;
};

export const deleteModelAPI = async (id: number): Promise<APIResponse> => {
  const response = await API.delete(`models/${id}`);
  revalidateTag('models');
  return response;
};
