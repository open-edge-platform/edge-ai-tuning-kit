// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
// ==============================|| TASKS TYPES ||============================== //
export interface CreateTaskProps {
  project_id: number;
  dataset_id: number;
  task_type: string;
  num_gpus: string;
  model_path: string;
  device: string;
  per_device_train_batch_size: string;
  per_device_eval_batch_size: string;
  gradient_accumulation_steps: string;
  learning_rate: string;
  num_train_epochs: string;
  lr_scheduler_type: string;
  optim: string;
  enabled_synthetic_generation: boolean;
}

export interface UpdateTasksProps {
  status: string;
}

export interface UpdateInferenceConfigProps {
  inference_configs: {
    temperature: number;
    max_new_tokens: number;
    prompt_template: string;
    isRAG: boolean;
  };
}

export interface TaskProps {
  id: number;
  configs: TaskConfigs;
  results: TaskResult;
  modified_date: string;
  project_id: number;
  download_progress: number;
  status: string;
  type: string;
  inference_configs: InferenceConfigs;
  created_date: string;
  celery_task_id: string;
  download_status: string;
}

interface TaskResult {
  status?: string;
  metrics?: Metric[];
  eval_history?: EvalHistory[];
  train_history?: TrainHistory[];
  train_runtime?: TrainRuntime[];
  max_steps?: number;
  start_time?: number;
  train_remaining_time?: string;
  recent_log_time?: number;
  stage?: string;
}

interface Metric {
  perplexity?: number;
  accuracy?: number;
}

interface EvalHistory {
  step: number;
  epoch: number;
  eval_loss: number;
  eval_runtime: number;
  eval_steps_per_second: number;
  eval_samples_per_second: number;
}

interface TrainHistory {
  loss: number;
  step: number;
  epoch: number;
  learning_rate: number;
}

interface TrainRuntime {
  step: number;
  epoch: number;
  total_flos: number;
  train_loss: number;
  train_runtime: number;
  train_steps_per_second: number;
  train_samples_per_second: number;
}

interface TaskConfigs {
  adapter_args: AdapterArgs;
  data_args: DataArgs;
  model_args: ModelArgs;
  training_args: TrainingArgs;
  training_configs: TrainingConfigs;
}

interface TrainingConfigs {
  enabled_synthetic_generation: boolean;
  num_gpus: number
}


interface TrainingArgs {
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

interface ModelArgs {
  device: string;
  model_name_or_path: string;
}

interface DataArgs {
  cuoff_len: number;
  data_path: string;
  system_message: string;
  task_id: string;
  tools: any;
}

interface AdapterArgs {
  bias: string;
  lora_alpha: number;
  lora_dropout: number;
  r: number;
  task_type: string;
  training_type: string;
}

export interface InferenceConfigs {
  isRAG: boolean;
  temperature: number;
  max_new_tokens: number;
  prompt_template: string;
}
