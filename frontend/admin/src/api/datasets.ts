// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use server';

import { revalidateTag } from 'next/cache';
import { API } from '@/utils/api';
import { constructURL } from '@/utils/common';

import { type APIResponse } from '@/types/api';
import { type UpdateDatasetProps } from '@/types/dataset';

export const getDatasetAPI = async (id: number): Promise<APIResponse> => {
  const url = `datasets/${id}`;
  return await API.get(url, { tags: [url] });
};

export const getDatasetEmbeddingsAPI = async (
  id: number,
  page?: number,
  pageSize?: number,
  source?: string
): Promise<APIResponse> => {
  const url = `datasets/${id}/text_embedding`;
  const fullURL = source ? constructURL(url, page, pageSize, { source }) : constructURL(url, page, pageSize);
  const response = await API.get(fullURL, { tags: [url] });
  return response;
};

export const getDatasetEmbeddingSourcesAPI = async (id: number): Promise<APIResponse> => {
  const url = `datasets/${id}/text_embedding_sources`;
  const response = await API.get(url, { tags: [url] });
  return response;
};

export const getDatasetGenerationMetadataAPI = async (id: number): Promise<APIResponse> => {
  return await API.get(`datasets/${id}/generation_metadata`, { revalidate: 0 });
};

export const createTextEmbeddingsAPI = async (
  id: number,
  chunkSize: number,
  chunkOverlap: number,
  data: FormData
): Promise<APIResponse> => {
  const response = await API.post(
    `datasets/${id}/text_embedding?chunk_size=${chunkSize}&chunk_overlap=${chunkOverlap}`,
    data,
    { headers: {} }
  );

  if (response.status) {
    revalidateTag(`datasets/${id}/text_embedding`);
    revalidateTag(`datasets/${id}/text_embedding_sources`);
  }

  return response;
};

export const updateDatasetAPI = async (id: number, data: UpdateDatasetProps): Promise<APIResponse> => {
  const response = await API.patch(`datasets/${id}`, data);
  if (response.status) {
    revalidateTag(`datasets/${id}`);
  }

  return response;
};

export const deleteTextEmbeddingByUUIDAPI = async (id: number, uuid: string): Promise<APIResponse> => {
  const response = await API.delete(`datasets/${id}/text_embeddings/${uuid}`);
  if (response.status) {
    revalidateTag(`datasets/${id}/text_embedding`);
  }
  return response;
};

export const deleteTextEmbeddingBySourceAPI = async (id: number, source: string): Promise<APIResponse> => {
  const response = await API.delete(`datasets/${id}/text_embeddings/source/${source}`);
  if (response.status) {
    revalidateTag(`datasets/${id}/text_embedding`);
    revalidateTag(`datasets/${id}/text_embedding_sources`);
  }
  return response;
};
