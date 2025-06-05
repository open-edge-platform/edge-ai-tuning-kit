// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
// ==============================|| MODEL TYPES ||============================== //
export interface ModelProps {
  id: number;
  model_id: string;
  model_dir: string;
  description: string;
  is_downloaded: boolean;
  model_metadata: ModelMetadata;
  download_metadata: DownloadMetadata;
  created_date: Date;
  modified_date: Date;
}

interface ModelMetadata {
  model_type: string;
  model_revision: string;
  is_custom_model: boolean;
}

export interface DownloadMetadata {
  progress: number;
  status: string;
}

export interface CreateModelProps {
  model_path: string;
  isChatModel: boolean;
  isCustomModel: boolean;
  isDownloaded: boolean;
  DownloadProgress: number;
  DownloadStatus: string;
  promptFormat: string;
  ErrorMessage?: string;
  description: string;
}
