// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React from 'react';
import { Add } from '@mui/icons-material';
import { Box, IconButton, Stack } from '@mui/material';

import { type TaskProps } from '@/types/task';
import { useDisclosure } from '@/hooks/use-disclosure';

import AddDeploymentDialog from './Dialog/AddDeploymentDialog';

export default function DeploymentHeader({
  tasks,
  projectType,
}: {
  tasks: TaskProps[];
  projectType: number;
}): React.JSX.Element {
  const { isOpen, onClose, onOpenChange } = useDisclosure();
  return (
    <>
      {/* <Stack direction="row" justifyContent="space-between"> */}
      <Stack direction="row" justifyContent="flex-end">
        {/* <TextField /> */}
        <Box>
          <IconButton
            onClick={() => {
              onOpenChange(true);
            }}
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': { backgroundColor: 'primary.main', opacity: '0.9' },
            }}
          >
            <Add sx={{ fontSize: 'var(--icon-fontSize-md)' }} />
          </IconButton>
        </Box>
        {
          tasks ?
            <AddDeploymentDialog projectType={projectType} tasks={tasks} isOpen={isOpen} onClose={onClose} />
            : null
        }
      </Stack>
    </>
  );
}
