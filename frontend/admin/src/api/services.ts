// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use server';

import { API } from '@/utils/api';

import { type APIResponse } from '@/types/api';

export const getModelIdAPI = async (): Promise<APIResponse> => {
  const url = `completions/models`;
  try {
    const response = await API.get(url, { revalidate: 0 });
    return response;
  } catch (error) {
    return { status: false, message: 'Error processing request', url: '' };
  }
};

export const prepareModelAPI = async (id: number): Promise<APIResponse> => {
  try {
    const url = `services/prepare_deployment_file?id=${id}`;
    const response = await API.post(url);
    // mutate(`services/start_inference_node?id=${id}`);
    return response;
  } catch (error) {
    return { status: false, message: 'Error processing request', url: '' };
  }
};

export const downloadModelAPI = async (id: number): Promise<APIResponse> => {
  try {
    const url = `services/download_deployment_file?id=${id}`;
    const response = await API.post(url);
    return response;
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  }
};

export const startInferenceServiceAPI = async (id: number, device: string): Promise<APIResponse> => {
  const url = `services/start_inference_node?id=${id}&device=${device}`;
  const response = await API.post(url);
  return response;
};

export const stopInferenceServiceAPI = async (id: number): Promise<APIResponse> => {
  const url = `services/stop_inference_node?id=${id}`;
  const response = await API.delete(url);
  return response;
};
