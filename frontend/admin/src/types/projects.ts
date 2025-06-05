// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
// ==============================|| PROJECTS TYPES ||============================== //
export interface ProjectProps {
  id: number;
  name: string;
  projectType: string;
  created_date: Date;
  modified_date: Date;
}

export interface CreateProjectProps {
  name: string;
  projectType: string;
}
