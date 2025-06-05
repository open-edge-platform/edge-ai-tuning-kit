// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { getDeploymentsAPI } from '@/api/deployment';
import { getProjectAPI } from '@/api/projects';
import { getTasksAPI } from '@/api/tasks';
import { Stack, Typography } from '@mui/material';

import { type DeploymentProps } from '@/types/deployment';
import { type ProjectProps } from '@/types/projects';
import DynamicPagination from '@/components/common/DynamicPagination';
import InfoTypography from '@/components/common/InfoTypography';
import DeploymentHeader from '@/components/project/Deployment/DeploymentHeader';
import DeploymentTable from '@/components/project/Deployment/DeploymentTable';
import Snackbar from '@/components/common/Snackbar';

export default async function DeploymentPage({ params }: { params: { id: string } }): Promise<React.JSX.Element> {
  const rowOptions = [5, 10, 50, 100];
  const projectID = parseInt(params.id);

  const { data: project, status: projectStatus } = await getProjectAPI(projectID);
  const { data: deployments, status: deploymentStatus } = await getDeploymentsAPI();
  const { data: tasks, status: taskStatus } = await getTasksAPI();

  return (
    <Stack spacing={3}>
      <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
        <Typography variant="h4">Deployment</Typography>
      </Stack>
      <InfoTypography>Deploy your trained models.</InfoTypography>

      <DeploymentHeader projectType={(project as ProjectProps)?.id} tasks={tasks} />
      <DeploymentTable data={deployments ?? []} />
      <DynamicPagination rowsOption={rowOptions} count={(deployments as DeploymentProps[])?.length ?? 0} />

      <Snackbar open={!(projectStatus && deploymentStatus && taskStatus)} variant="error" message="Error fetching data" />
    </Stack>
  );
}
