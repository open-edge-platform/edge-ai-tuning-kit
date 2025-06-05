// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use server';

import { revalidateTag } from 'next/cache';
import { API } from '@/utils/api';

import { type APIResponse } from '@/types/api';
import { type CreateProjectProps } from '@/types/projects';

export const getProjectsAPI = async (): Promise<APIResponse> => {
  const url = 'projects';
  return await API.get(url, { tags: [url], revalidate: 0 });
};

export const getProjectAPI = async (id: number): Promise<APIResponse> => {
  const url = `projects/${id}`;
  return await API.get(url, { tags: [url] });
};

export const createProjectAPI = async (data: CreateProjectProps): Promise<APIResponse> => {
  const response = await API.post('projects', data, { tags: ['create_project'] });
  revalidateTag('create_project');
  revalidateTag('projects');
  return response;
};

export const deleteProjectAPI = async (id: number): Promise<APIResponse> => {
  const response = await API.delete(`projects/${id}`);
  revalidateTag('projects');
  revalidateTag(`projects/${id}`);
  return response;
};
