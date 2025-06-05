// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { getDatasetDataAPI, getDatasetDataCountAPI } from '@/api/data';
import { getDatasetAPI } from '@/api/datasets';
import { getProjectAPI } from '@/api/projects';
import { Stack, Typography } from '@mui/material';

import { type ProjectProps } from '@/types/projects';
import DynamicPagination from '@/components/common/DynamicPagination';
import InfoTypography from '@/components/common/InfoTypography';
import DatasetHeader from '@/components/project/Dataset/DatasetHeader';
import DatasetTable from '@/components/project/Dataset/DatasetTable';
import Snackbar from '@/components/common/Snackbar';

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string; rows?: string };
}): Promise<React.JSX.Element> {
  const rowOptions = [5, 10, 50, 100];
  const currentPage = parseInt(searchParams.page ?? '1');
  const rowsPerPage = parseInt(searchParams.rows ?? rowOptions[0].toString());
  const projectID = parseInt(params.id);

  const { data: project, status: projectStatus } = await getProjectAPI(projectID);
  const { data: dataset, status: datasetStatus } = await getDatasetAPI(projectID);
  const { data, status: dataStatus } = await getDatasetDataAPI(projectID, currentPage, rowsPerPage);
  const { data: count, status: countStatus } = await getDatasetDataCountAPI(projectID);

  return (
    <Stack spacing={3}>
      <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
        <Typography variant="h4">Dataset</Typography>
      </Stack>
      <InfoTypography>Create or upload your dataset for model training.</InfoTypography>


      <DatasetHeader projectType={(project as ProjectProps)?.id} dataset={dataset} />
      <DatasetTable dataset={dataset} data={data ?? []} />
      <DynamicPagination rowsOption={rowOptions} count={count ?? 0} />

      <Snackbar open={!(projectStatus && datasetStatus && dataStatus && countStatus)} variant="error" message="Error fetching data" />

    </Stack>
  );
}
