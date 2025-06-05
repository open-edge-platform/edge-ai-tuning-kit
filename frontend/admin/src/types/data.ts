// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
// ==============================|| DATA TYPES ||============================== //
export interface DataProps {
  id: number;
  dataset_id: number;
  raw_data: Record<string, string>;
  isGenerated: boolean;
  created_date: Date;
  modified_date: Date;
}

export interface CreateDataProps {
  raw_data: Record<string, string>;
}

export interface UpdateDataProps {
  raw_data: Record<string, string>;
  isGenerated?: boolean;
}
