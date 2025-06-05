// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { Typography } from '@mui/material';
import { Stack } from '@mui/system';

import BackButton from '@/components/common/BackButton';
import TrainingInfo from '@/components/project/Training/TrainingInfo';

export default function TrainingDetailsPage({
  params,
}: {
  params: { id: string; task_id: string };
}): React.JSX.Element {
  const taskID = parseInt(params.task_id);
  const projectID = parseInt(params.id);
  const parentURL = `/project/${projectID}/training`;

  return (
    <Stack spacing={3}>
      <Stack spacing={1} sx={{ alignItems: 'center' }} direction="row">
        <BackButton url={parentURL} />
        <Typography variant="h5">Model-{taskID}</Typography>
      </Stack>

      <TrainingInfo taskID={taskID} />
    </Stack>
  );
}
