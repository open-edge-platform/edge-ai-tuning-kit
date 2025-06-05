// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React, { useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useSnackbar } from 'notistack';

import { type CreateDeploymentProps } from '@/types/deployment';
import { type TaskProps } from '@/types/task';
import { useCreateDeployment } from '@/hooks/api-hooks/use-deployment-api';
import { useGetRunningTask } from '@/hooks/api-hooks/use-task-api';

export default function AddDeploymentDialog({
  tasks,
  projectType,
  isOpen,
  onClose,
}: {
  tasks: TaskProps[];
  projectType: number;
  isOpen: boolean;
  onClose: VoidFunction;
}): React.JSX.Element {
  const { enqueueSnackbar } = useSnackbar();
  const createDeployment = useCreateDeployment();
  const filteredTasks = tasks.filter((task) => task.project_id === projectType && task.status === 'SUCCESS');
  const { data: runningTask, isLoading: isRunningTaskLoading } = useGetRunningTask();

  const supportedDevice = useMemo(() => {
    let isTraining = true;
    if (
      runningTask &&
      runningTask.status !== 'STARTED' &&
      runningTask.status !== 'RETRY' &&
      runningTask.status !== 'PENDING'
    ) {
      // Disable 'xpu' for evaluation if training is ongoing.
      isTraining = false;
    }

    return [
      {
        name: 'cpu',
        description: '4th Gen Intel® Xeon® Scalable Processor',
        disable: false,
      },
      {
        name: 'xpu',
        description: 'Intel® Discrete Graphics GPU',
        disable: isTraining,
      },
    ];
  }, [runningTask]);

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const availablePorts = Array.from({ length: 5 }, (_, index) => 5951 + index);
  const [deploymentConfigs, setDeploymentConfigs] = useState<CreateDeploymentProps>({
    host_address: '0.0.0.0',
    host_port: 5951,
    device: supportedDevice[0].name,
    model_id: filteredTasks[0]?.id,
    isEncryption: false,
  });

  const handleInputChange = (name: any, value: any): void => {
    if (name === 'model_id' && value === '') return;
    if (name === 'host_port' && value === '') return;
    setDeploymentConfigs((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeployClicked = async (): Promise<void> => {
    setIsSubmitted(true);
    const rawData = deploymentConfigs;
    createDeployment.mutate(
      { data: rawData },
      {
        onSuccess: (response) => {
          if (response?.status) {
            enqueueSnackbar(`Deployment created successfully.`, { variant: 'success' });
          } else {
            enqueueSnackbar(
              `Failed to deploy. Please check with admin.
        ${response?.message ? `[${response.message}]` : ''}`,
              { variant: 'error' }
            );
          }
        },
        onSettled: () => {
          setIsSubmitted(false);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold' }}>Add Deployment</DialogTitle>
      <Divider />
      {!isRunningTaskLoading && runningTask ? (
        <DialogContent>
          <Stack gap="1rem">
            <FormControl fullWidth>
              <TextField
                key="address-field-key"
                id="address-field"
                label="Host Address"
                required
                disabled
                defaultValue={deploymentConfigs.host_address}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  handleInputChange('host_address', event.target.value);
                }}
              />
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="port-select-label" required>
                Host Port
              </InputLabel>
              <Select
                labelId="port-select-label"
                id="port-select"
                value={deploymentConfigs.host_port}
                label="Host Port"
                required
                onChange={(event) => {
                  handleInputChange('host_port', event.target.value);
                }}
              >
                {availablePorts.map((port: number, index: number) => {
                  return (
                    <MenuItem key={index} value={port}>
                      {port}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="port-select-label" required>
                Model
              </InputLabel>
              <Select
                labelId="model-select-label"
                id="model-select"
                value={deploymentConfigs.model_id}
                label="Model"
                required
                onChange={(event) => {
                  handleInputChange('model_id', event.target.value);
                }}
              >
                {filteredTasks.map((model, index) => {
                  return (
                    <MenuItem key={index} value={model.id}>
                      {`model-${model.id.toString()}`}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="device-select-label" required>
                Device
              </InputLabel>
              <Select
                labelId="device-select-label"
                id="device-select"
                value={deploymentConfigs.device}
                label="Device"
                required
                onChange={(event) => {
                  handleInputChange('device', event.target.value);
                }}
              >
                {supportedDevice.map((device, index) => {
                  return (
                    <MenuItem key={index} value={device.name} disabled={device.disable}>
                      {device.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="contained"
              onClick={async () => {
                try {
                  await handleDeployClicked();
                } catch (error) {
                  console.error('Deployment failed:', error);
                  setIsSubmitted(false);
                }
              }}
            >
              {isSubmitted ? 'Deploying...' : 'Deploy'}
            </Button>
          </Stack>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
