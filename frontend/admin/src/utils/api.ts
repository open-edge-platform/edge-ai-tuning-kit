// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
import { type APIResponse } from '@/types/api';

interface RequestConfig {
  headers?: Record<string, any>;
  data?: any;
  tags?: string[];
  revalidate?: number;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const apiVersion = 'v1';

class FetchAPI {
  private baseURL: string;
  private allowedSchemes: string[] = ['http', 'https'];
  private disallowedPathCharacters = /[\\]|\.{2,}\//g;

  constructor(baseURL: string) {
    const baseUrlObj = new URL(baseURL);
    // Validate base URL
    if (!this.allowedSchemes.includes(baseUrlObj.protocol.replace(':', ''))) {
      throw new Error(`Unsupported URL scheme: ${baseUrlObj.protocol}`);
    }
    this.baseURL = new URL(`${apiVersion}/`, baseURL).toString();
  }

  private validateUrlPath(urlPath: string): string {
    const [path, _query] = urlPath.split('?');

    // Check for path traversal attempts only in the path portion
    if (this.disallowedPathCharacters.test(path)) {
      throw new Error('Invalid URL path');
    }

    return urlPath;
  }

  private async request(method: HttpMethod, url: string, config: RequestConfig = {}): Promise<APIResponse> {
    try {
      const { data, tags, revalidate, headers } = config;
      const fullURL = new URL(this.validateUrlPath(url), this.baseURL).toString();
      const options: RequestInit = {
        method,
        headers: headers ?? { 'Content-Type': 'application/json' },
        next: {
          ...(tags && { tags }),
          ...((revalidate || revalidate === 0) && { revalidate }),
        },
      };

      const request = new Request(fullURL, options);
      if (data && request.headers.get('Content-Type') === 'application/json') {
        options.body = JSON.stringify(data);
      } else {
        options.body = data;
      }

      const response = await fetch(fullURL, options);
      return this.handleResponse(response);
    } catch (err) {
      console.log(err);
      return {
        status: false,
        message: 'Error communicating with backend',
      } as APIResponse;
    }
  }

  private async handleResponse(response: Response): Promise<APIResponse> {
    const responseURL = response.url;
    const data = await response.json();
    if (!response.ok) {
      return {
        status: false,
        message: 'Error communicating with backend',
        url: response.url,
      } as APIResponse;
    }
    if ('status' in data) {
      return data as APIResponse;
    }
    return { status: true, data, url: responseURL } as APIResponse;
  }

  public async get(url: string, config?: RequestConfig): Promise<APIResponse> {
    return await this.request('GET', url, config);
  }

  public async post(url: string, data?: Record<string, any>, config?: RequestConfig): Promise<APIResponse> {
    return await this.request('POST', url, { ...config, data });
  }

  public async put(url: string, data?: Record<string, any>, config?: RequestConfig): Promise<APIResponse> {
    return await this.request('PUT', url, { ...config, data });
  }

  public async patch(url: string, data?: Record<string, any>, config?: RequestConfig): Promise<APIResponse> {
    return await this.request('PATCH', url, { ...config, data });
  }

  public async delete(url: string, config?: RequestConfig): Promise<APIResponse> {
    return await this.request('DELETE', url, config);
  }
}

export const API = (() => {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Validate the API URL from environment
  if (!apiUrl) {
    console.error('API URL not defined in environment variables');
    apiUrl = 'localhost';
  }

  try {
    return new FetchAPI(`http://${apiUrl}:5999`);
  } catch (error) {
    console.error('Failed to initialize API:', error);
    throw error;
  }
})();
