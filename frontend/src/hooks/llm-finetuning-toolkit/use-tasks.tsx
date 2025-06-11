// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios-client";
import type { Tool } from "@/settings/tool-list";

// Task interfaces based on backend models
export interface Task {
  id: number;
  type: "LORA";
  status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY" | "REVOKED";
  configs: TaskConfigs;
  inference_configs: InferenceConfigs;
  results: TaskResult;
  created_date?: string;
  modified_date?: string;
  celery_task_id?: string;
  project_id: number;
  download_status: "NOT_STARTED" | "STARTED" | "SUCCESS" | "FAILURE";
  download_progress?: number;
}

export interface TaskResult {
  status?: string;
  metrics?: Metric;
  eval_history?: EvalHistory[];
  train_history: TrainHistory[];
  train_runtime?: TrainRuntime[];
  max_steps?: number;
  start_time?: number;
  train_remaining_time?: string;
  recent_log_time?: number;
  stage?: string;
}

export interface Metric {
  accuracy?: number;
}

export interface EvalHistory {
  eval_loss: number;
  eval_mean_token_accuracy: number;
}

export interface TrainHistory {
  lr: number;
  loss: number;
  num_tokens: number;
  peak_memory_alloc: number;
  mean_token_accuracy: number;
  peak_memory_reserved: number;
  tokens_per_second_per_gpu: number;
}

export interface TrainRuntime {
  step: number;
  epoch: number;
  total_flos: number;
  train_loss: number;
  train_runtime: number;
  train_steps_per_second: number;
  train_samples_per_second: number;
}

export interface CreateTaskData {
  project_id: number;
  dataset_id: number;
  task_type: string;
  num_gpus: string;
  model_path: string;
  device: string;
  max_length: string;
  per_device_train_batch_size: string;
  per_device_eval_batch_size: string;
  gradient_accumulation_steps: string;
  learning_rate: string;
  num_train_epochs: string;
  lr_scheduler_type: string;
  optim: string;
  enabled_synthetic_generation: boolean;
}

export interface UpdateTaskData {
  status?: string;
  configs?: TaskConfigs;
  inference_configs?: InferenceConfigs;
  results?: TaskResult;
  celery_task_id?: string;
  download_status?: string;
  download_progress?: number;
}

export interface TaskConfigs {
  training_configs: TrainingConfigs;
  model_args: ModelArgs;
  dataset_args: DatasetArgs;
  training_args: TrainingArgs;
  logging_args?: {
    task_id: number;
  };
}

export interface TrainingConfigs {
  num_gpus: number;
  enabled_synthetic_generation: boolean;
}

export interface TrainingArgs {
  deepspeed: string;
  gradient_accumulation_steps: number;
  learning_rate: number;
  lr_scheduler_type: string;
  num_train_epochs: number;
  optim: string;
  output_dir: string;
  per_device_eval_batch_size: number;
  per_device_train_batch_size: number;
}

export interface ModelArgs {
  model_name_or_path: string;
  device: string;
  task_type: string;
  task_args: TaskArgs;
}

export interface TaskArgs {
  r: number;
  lora_alpha: number;
  lora_dropout: number;
  bias: string;
  task_type: string;
}

export interface DatasetArgs {
  train_dataset_path: string;
  eval_dataset_path: string;
  test_dataset_path: string;
  tools: Tool[] | null;
  system_message: string;
  max_seq_length: number;
}

export interface InferenceConfigs {
  isRAG: boolean;
  temperature: number;
  max_new_tokens: number;
  prompt_template: string;
}

export interface ErrorMessage {
  status: boolean;
  message: string;
}

// Query keys for React Query
export const taskKeys = {
  all: ["tasks"] as const,
  filtered: (filter: object) => [...taskKeys.all, filter] as const,
  detail: (id: number) => [...taskKeys.all, id] as const,
};

// Tasks API
const tasksApi = {
  // Get all tasks
  getAll: async (filter?: object): Promise<Task[]> => {
    const params = filter ? `?filter=${JSON.stringify(filter)}` : "";
    const response = await apiClient.get(`/tasks${params}`);
    return response.data.data;
  },

  // Get a single task by ID
  getById: async (id: number): Promise<Task> => {
    const response = await apiClient.get(`/tasks/${id}`);
    return response.data.data;
  },

  // Create a new task
  create: async (data: CreateTaskData): Promise<Task | ErrorMessage> => {
    const response = await apiClient.post("/tasks", data);
    return response.data;
  },

  // Update an existing task
  update: async (id: number, data: UpdateTaskData): Promise<Task> => {
    const response = await apiClient.patch(`/tasks/${id}`, data);
    return response.data;
  },

  // Delete a task
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },

  // Restart a task
  restart: async (id: number): Promise<Task> => {
    const response = await apiClient.post(`/tasks/${id}/restart`);
    return response.data;
  },
};

// Hook to fetch all tasks with optional filtering
export function useTasks(filter?: object, refetchInterval?: number) {
  return useQuery({
    queryKey: filter ? taskKeys.filtered(filter) : taskKeys.all,
    queryFn: () => tasksApi.getAll(filter),
    refetchInterval: refetchInterval || false,
  });
}

// Hook to fetch a single task by ID
export function useTask(id?: number, refetchInterval?: number) {
  return useQuery({
    queryKey: taskKeys.detail(id || 0),
    queryFn: () => {
      if (!id) {
        throw new Error("Task ID is required");
      }
      return tasksApi.getById(id);
    },
    enabled: !!id, // Only run the query if an ID is provided
    refetchInterval: refetchInterval || false, // Optional refetch interval
  });
}

// Hook to create a new task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskData) => tasksApi.create(data),
    onSuccess: () => {
      // Invalidate the tasks list query to refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// Hook to update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskData }) =>
      tasksApi.update(id, data),
    onSuccess: (updatedTask) => {
      // Update both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      if (updatedTask.id) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.detail(updatedTask.id),
        });
      }
    },
  });
}

// Hook to delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: (_data, id) => {
      // Update both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
    },
  });
}

// Hook to restart a task
export function useRestartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => tasksApi.restart(id),
    onSuccess: (_data, id) => {
      // Update both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
    },
  });
}
