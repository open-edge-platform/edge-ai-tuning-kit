// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { getDatasetDataCountAPI } from '@/api/data';
import { getModelsAPI } from '@/api/model';
import { getProjectAPI } from '@/api/projects';
import { Stack, Typography } from '@mui/material';

import { type ModelProps } from '@/types/model';
import { type ProjectProps } from '@/types/projects';
import InfoTypography from '@/components/common/InfoTypography';
import TaskHeader from '@/components/project/Training/TaskHeader';
import TaskTable from '@/components/project/Training/TaskTable';
import Snackbar from '@/components/common/Snackbar';

export default async function DocumentPage({
  params,
}: {
  params: { id: string };
  searchParams: { page?: string; rows?: string };
}): Promise<React.JSX.Element> {
  const projectID = parseInt(params.id);

  const { data: project, status: projectStatus } = await getProjectAPI(projectID);
  const { data: datasetCount, status: datasetStatus } = await getDatasetDataCountAPI(projectID);
  const { data: models, status: modelStatus } = await getModelsAPI();

  const getSupportedModel = (): ModelProps[] => {
    if ((project as ProjectProps)?.projectType === 'CHAT_MODEL') {
      return (models as ModelProps[])?.filter(
        (model) => model.model_metadata.model_type === 'TEXT_GENERATION' && model.is_downloaded
      );
    } else if ((project as ProjectProps)?.projectType === 'BASE_MODEL') {
      return (models as ModelProps[])?.filter(
        (model) => model.model_metadata.model_type === 'TEXT_GENERATION' && model.is_downloaded
      );
    }
    return [];
  };

  const supportedModels = getSupportedModel();

  return (
    <Stack spacing={3}>
      <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
        <Typography variant="h4">Training</Typography>
      </Stack>
      <InfoTypography>Train and evaluate your models.</InfoTypography>

      <TaskHeader datasetCount={datasetCount} project={project} models={supportedModels} />
      <TaskTable projectID={projectID} />
      <Snackbar open={!(projectStatus && datasetStatus && modelStatus)} variant="error" message="Error fetching data" />
    </Stack>
  );
}
