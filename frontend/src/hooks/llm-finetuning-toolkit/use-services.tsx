// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios-client";

// Service interfaces based on backend models
export interface InferenceService {
  id: number;
  modelID: string;
  status: boolean;
  message: string;
  device?: string;
}

export interface StartInferenceParams {
  id: number;
  device?: string;
}

export interface StopInferenceParams {
  id: number;
}

export interface PrepareDeploymentParams {
  id: number;
}

export interface ChatCompletionParams {
  modelID: string;
  messages: { content: string; role: string }[];
  max_tokens?: number;
  temperature?: number;
}

// Query keys for React Query
export const serviceKeys = {
  all: ["models"] as const,
  inference: ["inference"] as const,
  availableModels: ["availableModels"] as const,
};

// Services API
const servicesApi = {
  // Start an inference service
  startInference: async ({ id, device = "cpu" }: StartInferenceParams) => {
    const response = await apiClient.post(
      `/services/start_inference_node?id=${id}&device=${device}`
    );
    return response.data;
  },

  // Stop an inference service
  stopInference: async ({ id }: StopInferenceParams) => {
    const response = await apiClient.delete(
      `/services/stop_inference_node?id=${id}`
    );
    return response.data;
  },

  // Prepare deployment file for a model
  prepareDeployment: async ({ id }: PrepareDeploymentParams) => {
    const response = await apiClient.post(
      `/services/prepare_deployment_file?id=${id}`
    );
    return response.data;
  },

  // Get all running model IDs
  getRunningModels: async () => {
    const response = await apiClient.get<string[]>("/services/inference");
    return response.data.length > 0 ? response.data[0] : null;
  },

  // Get all available models
  getModels: async () => {
    try {
      const response = await apiClient.get("/completions/models");
      return response.data;
    } catch (error) {
      console.error("Error fetching models:", error);
      return null;
    }
  },
};

/**
 * Hook to start the inference service for a model
 * @returns Mutation functions to start an inference service
 */
export function useStartInferenceService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StartInferenceParams) =>
      servicesApi.startInference(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
    onError: () => {
      console.error("Error starting inference service.");
    },
  });
}

/**
 * Hook to stop the inference service for a model
 * @returns Mutation functions to stop an inference service
 */
export function useStopInferenceService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StopInferenceParams) =>
      servicesApi.stopInference(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
    onError: () => {
      console.error("Error stopping inference service.");
    },
  });
}

/**
 * Hook to prepare deployment file for a model
 * @returns Mutation functions to prepare a deployment file
 */
export function usePrepareDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: PrepareDeploymentParams) =>
      servicesApi.prepareDeployment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
    onError: () => {
      console.error("Error preparing deployment file.");
    },
  });
}

/**
 * Hook to fetch available models with automatic retrying until timeout
 * @param enabled Whether the query is enabled
 * @param device The current device (cpu/xpu)
 * @returns Query object with models data
 */
export function useGetModelId(enabled = false, device = "cpu") {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: [...serviceKeys.availableModels, device],
    queryFn: () => servicesApi.getModels(),
    refetchInterval: 5000,
    retry: true,
    retryDelay: 2000, // Retry every 2 seconds on error
    staleTime: 0, // Always consider data as stale to force refetching
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    gcTime: FIVE_MINUTES_MS,
    enabled: enabled,
  });

  // Return both the query result and a resetData function to allow manual reset
  return {
    ...query,
    resetData: () => {
      // Remove the query data to force a fresh fetch
      queryClient.removeQueries({ queryKey: [...serviceKeys.availableModels, device] });
    }
  };
}
