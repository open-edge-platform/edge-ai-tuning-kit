// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { getDatasetAPI, getDatasetEmbeddingsAPI } from '@/api/datasets';
import { Stack, Typography } from '@mui/material';

import { type DatasetProps, type DocumentProps } from '@/types/dataset';
import BackButton from '@/components/common/BackButton';
import DynamicPagination from '@/components/common/DynamicPagination';
import InfoTypography from '@/components/common/InfoTypography';
import DocumentChunkTable from '@/components/project/Document/Chunk/ChunkTable';
import Snackbar from '@/components/common/Snackbar';

export default async function DocumentChunkPage({
  params,
  searchParams,
}: {
  params: { id: string; source: string };
  searchParams: { page?: string; rows?: string };
}): Promise<React.JSX.Element> {
  const projectID = parseInt(params.id);
  const documentSource = params.source.replace(/%20/g, ' ');

  const rowOptions = [5, 10, 50, 100];
  const currentPage = parseInt(searchParams.page ?? '1');
  const rowsPerPage = parseInt(searchParams.rows ?? rowOptions[0].toString());
  const { data: embeddings, status: embeddingStatus } = await getDatasetEmbeddingsAPI(projectID, currentPage, rowsPerPage, documentSource);
  const { data: dataset, status: datasetStatus } = await getDatasetAPI(projectID);

  const parentURL = `/project/${projectID}/document`;

  return (
    <Stack spacing={3}>
      <Stack spacing={1} sx={{ alignItems: 'center' }} direction="row">
        <BackButton url={parentURL} />
        <Typography variant="h5">{decodeURI(documentSource)}</Typography>
      </Stack>
      {(embeddings as DocumentProps)?.num_embeddings === 0 ? (
        <InfoTypography>
          The uploaded document has incorrect format. Please ensure you have correct document format.
        </InfoTypography>
      ) : (
        <>
          <InfoTypography>Manage your document chunks here</InfoTypography>
          <DocumentChunkTable
            data={(embeddings as DocumentProps)?.doc_chunks ?? []}
            datasetID={(dataset as DatasetProps)?.id}
          />
          <DynamicPagination rowsOption={rowOptions} count={(embeddings as DocumentProps)?.num_embeddings ?? 0} />
        </>
      )}
      <Snackbar open={!datasetStatus || !embeddingStatus} variant="error" message="Error fetching data" />
    </Stack>
  );
}
