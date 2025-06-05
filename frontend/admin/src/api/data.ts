// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use server';

import { revalidateTag } from 'next/cache';
import { API } from '@/utils/api';
import { constructURL } from '@/utils/common';

import { type APIResponse } from '@/types/api';
import { type CreateDataProps, type DataProps } from '@/types/data';

export const getDatasetDataAPI = async (id: number, page?: number, pageSize?: number): Promise<APIResponse> => {
  const url = `datasets/${id}/data`;
  const fullURL = constructURL(url, page, pageSize);
  const response = await API.get(fullURL, { tags: [url], revalidate: 0 });
  return response;
};

export const getDatasetDataCountAPI = async (id: number): Promise<APIResponse> => {
  const url = `datasets/${id}/data/count`;
  const response = await API.get(url, { tags: [url], revalidate: 0 });
  return response;
};

export const createDataAPI = async (id: number, data: CreateDataProps): Promise<APIResponse> => {
  const response = await API.post(`datasets/${id}/data`, data);
  revalidateTag(`datasets/${id}/data`);
  revalidateTag(`datasets/${id}/data/count`);
  return response;
};

export const generateDocumentDatasetAPI = async (params: Record<string, any>): Promise<APIResponse> => {
  const response = await API.post(`data/generate_document_qa?${new URLSearchParams(params).toString()}`, {
    headers: {},
  });
  return response;
};

export const uploadDocumentAPI = async (params: Record<string, string>, data: FormData): Promise<APIResponse> => {
  const response = await API.post(`data/generate_qa?${new URLSearchParams(params).toString()}`, data, {
    headers: {},
  });
  return response;
};

export const stopDataGenerationAPI = async (id: number): Promise<APIResponse> => {
  const response = await API.post(`data/stop_data_generation/${id}`);
  return response;
};

export const uploadJsonDataAPI = async (id: string, data: FormData): Promise<APIResponse> => {
  const response = await API.post(`data/upload_file/${id}`, data, {
    headers: {},
  });
  revalidateTag(`datasets/${id}/data/count`);
  revalidateTag(`datasets/${id}/data`);
  revalidateTag(`data/${id}`);
  return response;
};


export const updateDataAPI = async (id: number, data: DataProps): Promise<APIResponse> => {
  const response = await API.patch(`data/${id}`, data);
  revalidateTag(`datasets/${id}/data/count`);
  revalidateTag(`datasets/${id}/data`);
  revalidateTag(`data/${id}`);
  return response;
};

export const deleteDataAPI = async (id: number): Promise<APIResponse> => {
  const response = await API.delete(`data/${id}`);
  revalidateTag(`datasets/${id}/data`);
  revalidateTag(`datasets/${id}/data/count`);
  return response;
};

export const revalidateDatasetData = async (id: number): Promise<void> => {
  revalidateTag(`datasets/${id}/data`);
  revalidateTag(`datasets/${id}/data/count`);
};
