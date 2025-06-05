// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
// ==============================|| DEPLOYMENT TYPES ||============================== //
export interface DeploymentProps {
  id: number;
  settings: {
    host_port: number;
    device: string;
    host_address: string;
    isEncryption: boolean;
  }
  model_id: number;
  created_date: Date;
  modified_date: Date;
}

export interface CreateDeploymentProps {
  host_address: string;
  host_port: number;
  model_id: number;
  device: string;
  isEncryption: boolean;
}

export interface UpdateDeploymentProps {
  raw_data: object;
  isGenerated?: boolean;
}

export interface CheckDeploymentProps {
  status?: boolean;
  message?: string;
  data?: object
}
