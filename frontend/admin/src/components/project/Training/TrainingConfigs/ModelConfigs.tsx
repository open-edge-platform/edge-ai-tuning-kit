// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { ExpandMore } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip,
  Typography,
} from '@mui/material';

import { type ModelProps } from '@/types/model';
import { type CreateTaskProps } from '@/types/task';

import { numGPUs, supportedDevice, supportedTaskType } from './configs';

export default function ModelConfig({
  models,
  taskConfigs,
  handleChange,
  handleInputChange,
  expanded,
  disabled = false,
}: {
  expanded: string | false;
  taskConfigs: CreateTaskProps;
  models?: ModelProps[];
  handleChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  handleInputChange?: (name: string, value: string | boolean) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const tooltipTitle = disabled ? 'Parameter changes are only permitted before the training process.' : '';
  const handleNumGPUsChange = React.useCallback(
    (e: SelectChangeEvent) => {
      if (!disabled && handleInputChange) {
        handleInputChange('num_gpus', e.target.value);
      }
    },
    [disabled, handleInputChange]
  );

  return (
    <Accordion elevation={5} expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
      <AccordionSummary expandIcon={<ExpandMore />} aria-controls="panel1bh-content" id="panel1bh-header">
        <Typography variant="body2" sx={{ width: '33%', flexShrink: 0 }}>
          Model Configs
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Configure Model Parameters
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Tooltip title={tooltipTitle} arrow>
          <FormControl sx={{ m: 1, width: '100%' }} disabled={disabled}>
            <InputLabel id="model-label" required>
              Model
            </InputLabel>
            <Select
              labelId="model-label"
              id="model-label"
              value={taskConfigs.model_path}
              onChange={(e) => {
                if (!disabled && handleInputChange) handleInputChange('model_path', e.target.value);
              }}
              label="Model"
            >
              {!disabled && models ? (
                models.map((model, index) => (
                  <MenuItem key={index} value={model.model_id}>
                    {model.model_id}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value={taskConfigs.model_path}>{taskConfigs.model_path}</MenuItem>
              )}
            </Select>
          </FormControl>
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <FormControl sx={{ m: 1, width: '100%' }} disabled={disabled}>
            <InputLabel id="device-label" required>
              Device
            </InputLabel>
            <Select
              labelId="device-label"
              id="device-label"
              value={taskConfigs.device}
              onChange={(e) => {
                if (!disabled && handleInputChange) handleInputChange('device', e.target.value);
              }}
              label="Device"
              required
            >
              {supportedDevice.map((device, index) => (
                <MenuItem key={index} value={device.name}>
                  {device.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <FormControl sx={{ m: 1, width: '100%' }} disabled={disabled}>
            <InputLabel id="num-gpu-label" required>
              Number of GPUs
            </InputLabel>
            <Select
              labelId="num-gpu-label"
              id="num-gpu-label"
              value={taskConfigs.num_gpus}
              onChange={handleNumGPUsChange}
              label="Number of GPUs"
              required
            >
              {numGPUs.map((selection, index) => (
                <MenuItem key={index} value={selection.name}>
                  {selection.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <FormControl sx={{ m: 1, width: '100%' }} disabled={disabled}>
            <InputLabel id="type-label" required>
              Task Type
            </InputLabel>
            <Select
              labelId="type-label"
              id="type-label"
              value={taskConfigs.task_type}
              onChange={(e) => {
                if (!disabled && handleInputChange) handleInputChange('task_type', e.target.value);
              }}
              label="Task Type"
              required
            >
              {supportedTaskType.map((taskType, index) => (
                <MenuItem key={index} value={taskType.name}>
                  {taskType.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Tooltip>
      </AccordionDetails>
    </Accordion>
  );
}
