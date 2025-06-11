// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

export interface TrainingMetrics {
  loss: number[];
  accuracy: number[];
  validationLoss: number[];
  validationAccuracy: number[];
  timestamps: string[];
}

export interface HardwareStats {
  gpuUtilization: number;
  gpuMemoryUsage: number;
  cpuUtilization: number;
  ramUsage: number;
  temperature: number;
}

export interface CreateTaskProps {
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

export interface FilterState {
  status: string[];
  model: string[];
  hardware: string[];
}
