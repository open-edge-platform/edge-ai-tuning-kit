// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

// Framework import
import React, { useState } from 'react';
import { Button, Dialog, DialogContent, DialogTitle, Divider, Stack, TextField } from '@mui/material';
import { enqueueSnackbar } from 'notistack';

import { useCreateProject } from '@/hooks/api-hooks/use-project-api';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: VoidFunction;
}

export default function AddProjectDialog({ isOpen, onClose }: ProjectModalProps): React.JSX.Element {
  const [projectName, setProjectName] = useState('');
  const projectType = 'CHAT_MODEL';
  const createProject = useCreateProject();

  const handleActionClicked = (): void => {
    createProject.mutate(
      { data: { name: projectName, projectType } },
      {
        onSuccess: async (response) => {
          if (response.status) {
            enqueueSnackbar(`Project: ${projectName} created successfully.`, { variant: 'success' });
          } else {
            enqueueSnackbar('Failed to create project. Please check with admin.', { variant: 'error' });
          }
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold' }}>Add Project</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack gap="1rem">
          <TextField
            required
            fullWidth
            id="project-name"
            label="Name"
            value={projectName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setProjectName(event.target.value);
            }}
          />
          <Button
            fullWidth
            variant="contained"
            disabled={projectName === ''}
            onClick={() => {
              handleActionClicked();
            }}
          >
            Add
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
