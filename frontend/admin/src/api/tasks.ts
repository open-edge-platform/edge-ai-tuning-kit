// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use server';

import { revalidateTag } from 'next/cache';
import { API } from '@/utils/api';

import { type APIResponse } from '@/types/api';
import { type CreateTaskProps, type UpdateInferenceConfigProps, type UpdateTasksProps } from '@/types/task';

export const getTasksAPI = async (): Promise<APIResponse> => {
  const url = `tasks`;
  const response = await API.get(url, { tags: [url] });
  return response;
};

export const getTaskByIDAPI = async (id: number, revalidate = 0): Promise<APIResponse> => {
  const url = `tasks/${id}`;
  const response = await API.get(url, { tags: [url], revalidate });
  return response;
};

export const getRunningTaskAPI = async (): Promise<APIResponse> => {
  const url = `tasks/celery/running_task`;
  const response = await API.get(url, { tags: [url] });
  return response;
};

export const getTasksByProjectIDAPI = async (id: number, revalidate: number): Promise<APIResponse> => {
  const filter = { project_id: id };
  const filterQuery = encodeURIComponent(JSON.stringify(filter));
  const url = `tasks?filter=${filterQuery}`;
  const response = await API.get(url, { revalidate });
  return response;
};

export const createTaskAPI = async (data: CreateTaskProps): Promise<APIResponse> => {
  const response = await API.post('tasks', data);
  if (response.status) {
    revalidateTag('tasks');
  }
  return response;
};

export const restartTaskAPI = async (id: number): Promise<APIResponse> => {
  const response = await API.post(`tasks/${id}/restart`);
  if (response.status) {
    revalidateTag('tasks');
  }
  return response;
}

export const updateTaskAPI = async (id: number, data: UpdateTasksProps): Promise<APIResponse> => {
  const url = `tasks/${id}`;
  const response = await API.patch(url, data);
  if (response.status) {
    revalidateTag('tasks');
    revalidateTag(`tasks/${id}`);
  }
  return response;
};

export const deleteTaskAPI = async (id: number): Promise<APIResponse> => {
  const response = await API.delete(`tasks/${id}`);
  revalidateTag('tasks');
  revalidateTag(`tasks/${id}`);
  return response;
};

export const updateInferenceConfigsAPI = async (id: number, data: UpdateInferenceConfigProps): Promise<APIResponse> => {
  const response = await API.patch(`tasks/${id}`, data);
  revalidateTag('tasks');
  return response;
};
