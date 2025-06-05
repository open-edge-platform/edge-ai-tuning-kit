// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { getProjectsAPI } from '@/api/projects';
import { Stack } from '@mui/material';

import ProjectCardList from '@/components/project/ProjectList/ProjectCardList';
import ProjectListHeader from '@/components/project/ProjectList/ProjectsListHeader';
import Snackbar from '@/components/common/Snackbar';

export default async function HomePage(): Promise<React.JSX.Element> {
  const { data: projects, status } = await getProjectsAPI();
  return (
    <Stack spacing={3}>
      <ProjectListHeader />
      <ProjectCardList projects={projects ?? []} />
      <Snackbar open={!status} variant="error" message="Error fetching project" />
    </Stack>
  );
}
