// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { getDatasetAPI } from '@/api/datasets';
import { Stack, Typography } from '@mui/material';

import InfoTypography from '@/components/common/InfoTypography';
import SystemMessageTextField from '@/components/project/SystemMessage/SystemMessageTextField';
import Snackbar from '@/components/common/Snackbar';

export default async function SystemMessagePage({ params }: { params: { id: string } }): Promise<React.JSX.Element> {
  const { status, data: dataset, message } = await getDatasetAPI(parseInt(params.id));
  return (
    <Stack spacing={3}>
      <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
        <Typography variant="h4">System Message</Typography>
      </Stack>
      <InfoTypography>View and edit the system message of the model</InfoTypography>
      <SystemMessageTextField dataset={dataset ?? {}} />
      <Snackbar open={!status} variant="error" message={message ?? "Error fetching dataset"} />
    </Stack>
  );
}
