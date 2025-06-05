// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

// Framework import
import React, { useState } from 'react';
import { LoadingButton } from '@mui/lab';
import { Dialog, DialogContent, DialogTitle, Divider, Stack } from '@mui/material';
import { Box } from '@mui/system';
import { enqueueSnackbar } from 'notistack';

import { type ModelProps } from '@/types/model';
import { type ProjectProps } from '@/types/projects';
import { type CreateTaskProps } from '@/types/task';
import { useCreateTask } from '@/hooks/api-hooks/use-task-api';

import ExperimentalParameters from '../TrainingConfigs/ExperimentalParameters';
import ModelConfig from '../TrainingConfigs/ModelConfigs';
import TrainingParameters from '../TrainingConfigs/TrainingParameters';
import { supportedDevice } from '../TrainingConfigs/configs';

export default function AddTaskDialog({
  isOpen,
  onClose,
  project,
  models,
}: {
  isOpen: boolean;
  onClose: VoidFunction;
  project: ProjectProps;
  models: ModelProps[];
}): React.JSX.Element {
  const [taskConfigs, setTaskConfigs] = useState<CreateTaskProps>({
    project_id: project.id,
    dataset_id: project.id,
    task_type: 'QLORA',
    num_gpus: '-1',
    model_path: models[0]?.model_id,
    device: supportedDevice[0].name,
    per_device_train_batch_size: '2',
    per_device_eval_batch_size: '1',
    gradient_accumulation_steps: '1',
    learning_rate: '0.0001',
    num_train_epochs: '10',
    lr_scheduler_type: 'cosine',
    optim: 'adamw_hf',
    enabled_synthetic_generation: true,
  });
  const [expanded, setExpanded] = useState<string | false>('panel1');
  const createTask = useCreateTask();

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleInputChange = (name: string, value: string | boolean): void => {
    if (name === 'model_path' && value === '') return;
    if (name === 'device' && value === '') return;
    setTaskConfigs((prev) => ({ ...prev, [name]: value }));
  };

  const handleButtonClicked = (): void => {
    createTask.mutate(
      { data: taskConfigs },
      {
        onSuccess: (response) => {
          if (response.status) {
            enqueueSnackbar(`Model training started successfully.`, { variant: 'success' });
            onClose();
          } else {
            enqueueSnackbar(`Failed to train the model. Please check with admin.`, { variant: 'error' });
          }
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold' }}>Add Task</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack>
          <Box>
            <ModelConfig
              models={models}
              expanded={expanded}
              taskConfigs={taskConfigs}
              handleChange={handleChange}
              handleInputChange={handleInputChange}
            />
            <TrainingParameters
              expanded={expanded}
              taskConfigs={taskConfigs}
              handleChange={handleChange}
              handleInputChange={handleInputChange}
            />
            <ExperimentalParameters expanded={expanded} handleChange={handleChange} />
          </Box>
          <LoadingButton
            onClick={() => {
              handleButtonClicked();
            }}
            loading={createTask.isPending}
            variant="contained"
            sx={{ mt: 3 }}
            fullWidth
          >
            {taskConfigs !== null ? (
              <>{createTask.isPending ? 'Training...' : 'Train'}</>
            ) : (
              <>{createTask.isPending ? 'Editing' : 'Edit'}</>
            )}
          </LoadingButton>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
