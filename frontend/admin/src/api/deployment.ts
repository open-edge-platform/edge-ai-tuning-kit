// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use server';

import { revalidateTag } from 'next/cache';
import { API } from '@/utils/api';

import { type APIResponse } from '@/types/api';
import { type CreateDeploymentProps } from '@/types/deployment';

export const getDeploymentsAPI = async (): Promise<APIResponse> => {
  const url = `deployments`
  revalidateTag(url);
  const response = await API.get(url, { tags: [url] });
  return response
};

export const createDeploymentAPI = async (data: CreateDeploymentProps): Promise<APIResponse> => {
  const response = await API.post('deployments', data);
  revalidateTag('deployments');
  return response;
};

export const deleteDeploymentAPI = async (id: number): Promise<APIResponse> => {
  const url = `deployments/${id}`
  const response = await API.delete(url);
  revalidateTag('deployments');
  return response;
};

export const checkDeploymentAPI = async (id: number): Promise<APIResponse> => {
  const url = `deployments/check_deployment/${id}`
  const response = await API.get(url);
  return response;
};