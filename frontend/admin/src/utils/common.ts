// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
import { type APIResponse } from '@/types/api';

export function constructURL(url: string, page?: number, pageSize?: number, params?: Record<string, string>): string {
  let fullURL = url;
  if (page && pageSize) {
    const urlParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...params,
    });

    fullURL = `${url}?${urlParams.toString()}`;
  }

  return fullURL;
}

export function handleAPIResponse<T>(response: APIResponse): T {
  if (!response.status) {
    throw new Error(response.message ?? 'Error processing request');
  }

  return response.data as T;
}

export function capitalize(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
