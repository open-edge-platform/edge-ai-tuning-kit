// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { Stack, Typography } from '@mui/material';

import InfoTypography from '@/components/common/InfoTypography';
import ModelTable from '@/components/models/ModelTable';

// Components
export default async function HomePage(): Promise<React.JSX.Element> {
  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Models</Typography>
        </Stack>
      </Stack>
      <InfoTypography>Download & manage model for training.</InfoTypography>
      <ModelTable />
    </Stack>
  );
}
