// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { getDatasetAPI, getDatasetEmbeddingSourcesAPI } from '@/api/datasets';
import { Stack, Typography } from '@mui/material';

import { type DatasetProps } from '@/types/dataset';
import InfoTypography from '@/components/common/InfoTypography';
import DocumentSourceHeader from '@/components/project/Document/DocumentSourceHeader';
import DocumentSourceTable from '@/components/project/Document/DocumentSourceTable';
import Snackbar from '@/components/common/Snackbar';

export default async function DocumentPage({ params }: { params: { id: string } }): Promise<React.JSX.Element> {
  const projectID = parseInt(params.id);

  const { data: dataset, status: datasetStatus } = await getDatasetAPI(projectID);
  const { data: source, status: sourceStatus } = await getDatasetEmbeddingSourcesAPI((dataset as DatasetProps)?.id);

  return (
    <Stack spacing={3}>
      <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
        <Typography variant="h4">Document</Typography>
      </Stack>
      <InfoTypography>Create your vector database by uploading your documents.</InfoTypography>

      <DocumentSourceHeader dataset={dataset} />
      <DocumentSourceTable
        datasetID={(dataset as DatasetProps)?.id}
        data={source ?? []}
      />
      <Snackbar open={!datasetStatus || !sourceStatus} variant="error" message="Error fetching dataset" />
    </Stack>
  );
}
