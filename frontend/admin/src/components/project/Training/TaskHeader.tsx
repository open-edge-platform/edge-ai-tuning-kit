// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React from 'react';
import { Add } from '@mui/icons-material';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';

import { type ModelProps } from '@/types/model';
import { type ProjectProps } from '@/types/projects';
import { useDisclosure } from '@/hooks/use-disclosure';

import AddTaskDialog from './Dialog/AddTrainingModal';

export default function TaskHeader({
  datasetCount,
  project,
  models,
}: {
  datasetCount: number;
  project: ProjectProps;
  models: ModelProps[];
}): React.JSX.Element {
  const { isOpen, onClose, onOpenChange } = useDisclosure();
  return (
    <>
      <Stack direction="row" justifyContent="flex-end">
        <Tooltip title={datasetCount < 5 ? 'Required minimum 5 rows of data for training' : 'Train Model'}>
          <Box>
            <IconButton
              onClick={() => {
                onOpenChange(true);
              }}
              disabled={datasetCount < 5}
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': { backgroundColor: 'primary.main', opacity: '0.9' },
              }}
            >
              <Add sx={{ fontSize: 'var(--icon-fontSize-md)' }} />
            </IconButton>
          </Box>
        </Tooltip>
      </Stack>
      {
        project ?
          <AddTaskDialog isOpen={isOpen} onClose={onClose} project={project} models={models} />
          : null
      }
    </>
  );
}
