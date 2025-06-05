// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
export interface DatasetProps {
  id: number;
  project_id: number;
  name: string;
  prompt_template: string;
  generation_metadata: GenerationMetadata;
  created_date: Date;
  modified_date: Date;
}

export interface CreateDatasetProps {
  project_id: number;
  name: string;
  prompt_template: string;
}

export interface CreateTextBeddingsProps {
  id: number;
  chunkSize: number;
  chunkOverlap: number;
  data: FormData;
}

export interface UpdateDatasetProps extends CreateDatasetProps {
  generation_metadata: object;
}

// FIXME: camel case + snake case?
export interface GenerationMetadata {
  status: string;
  isCancel: boolean;
  total_page: number;
  total_files: number;
  current_page: number;
  processed_files: number;
}

export interface DocumentProps {
  num_embeddings: number;
  doc_chunks: ChunkProps[];
  current_page: number;
  total_pages: number;
}

export interface ChunkProps {
  ids: string;
  chunk: string;
  source: string;
  page: number;
}
