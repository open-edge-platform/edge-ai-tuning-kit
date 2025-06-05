// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { ExpandMore } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';

import { type CreateTaskProps } from '@/types/task';

export default function TrainingParameters({
  expanded,
  taskConfigs,
  handleChange,
  handleInputChange,
  disabled = false,
}: {
  expanded: string | false;
  taskConfigs: CreateTaskProps;
  handleChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  handleInputChange?: (name: string, value: string | boolean) => void;
  disabled?: boolean
}): React.JSX.Element {
  const tooltipTitle = disabled ? 'Parameter changes are only permitted before or after the training process.' : ''

  return (
    <Accordion elevation={5} expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
      <AccordionSummary expandIcon={<ExpandMore />} aria-controls="panel2bh-content" id="panel2bh-header">
        <Typography variant="body2" sx={{ width: '33%', flexShrink: 0 }}>
          Training Parameters
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Configure Training Parameters
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Tooltip title={tooltipTitle} arrow>
          <TextField
            required
            id="outlined-required"
            label="Training Batch Size"
            disabled={disabled}
            defaultValue={taskConfigs.per_device_train_batch_size}
            onChange={(e) => {
              if (!disabled && handleInputChange)
                handleInputChange('per_device_train_batch_size', e.target.value);
            }}
            sx={{ m: 1, width: '100%' }}
          />
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <TextField
            required
            id="outlined-required"
            label="Evaluation Batch Size"
            disabled={disabled}
            defaultValue={taskConfigs.per_device_eval_batch_size}
            onChange={(e) => {
              if (!disabled && handleInputChange)
                handleInputChange('per_device_eval_batch_size', e.target.value);
            }}
            sx={{ m: 1, width: '100%' }}
          />
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <TextField
            required
            id="outlined-required"
            label="Gradient Accumulation Steps"
            disabled={disabled}
            defaultValue={taskConfigs.gradient_accumulation_steps}
            onChange={(e) => {
              if (!disabled && handleInputChange)
                handleInputChange('gradient_accumulation_steps', e.target.value);
            }}
            sx={{ m: 1, width: '100%' }}
          />
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <TextField
            required
            id="outlined-required"
            label="Model Learning Rate"
            disabled={disabled}
            defaultValue={taskConfigs.learning_rate}
            onChange={(e) => {
              if (!disabled && handleInputChange)
                handleInputChange('learning_rate', e.target.value);
            }}
            sx={{ m: 1, width: '100%' }}
          />
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <FormControl sx={{ m: 1, width: '100%' }} disabled={disabled}>
            <InputLabel id="demo-simple-select-autowidth-label" required>
              lr_scheduler_type
            </InputLabel>
            <Select
              labelId="demo-simple-select-autowidth-label"
              id="demo-simple-select-autowidth"
              value={taskConfigs.lr_scheduler_type}
              onChange={(e) => {
                if (!disabled && handleInputChange)
                  handleInputChange('lr_scheduler_type', e.target.value);
              }}
              label="lr_scheduler_type"
              required
            >
              <MenuItem value="cosine">cosine</MenuItem>
              <MenuItem value="linear">linear</MenuItem>
            </Select>
          </FormControl>
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <TextField
            required
            id="outlined-required"
            label="Number of Training Epochs"
            defaultValue={taskConfigs.num_train_epochs}
            disabled={disabled}
            onChange={(e) => {
              if (!disabled && handleInputChange)
                handleInputChange('num_train_epochs', e.target.value);
            }}
            sx={{ m: 1, width: '100%' }}
          />
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <FormControl sx={{ m: 1, width: '100%' }} disabled={disabled}>
            <InputLabel id="demo-simple-select-autowidth-label">optim *</InputLabel>
            <Select
              labelId="demo-simple-select-autowidth-label"
              id="demo-simple-select-autowidth"
              value={taskConfigs.optim}
              onChange={(e) => {
                if (!disabled && handleInputChange)
                  handleInputChange('optim', e.target.value);
              }}
              label="optim"
              required
            >
              <MenuItem value="adamw_hf">adamw_hf</MenuItem>
            </Select>
          </FormControl>
        </Tooltip>
        <Tooltip title={tooltipTitle} arrow>
          <FormControlLabel
            control={
              <Checkbox
                disabled={disabled}
                checked={taskConfigs.enabled_synthetic_generation}
                onChange={() => {
                  if (!disabled && handleInputChange)
                    handleInputChange('enabled_synthetic_generation', !taskConfigs.enabled_synthetic_generation);
                }}
              />
            }
            label="Synthetic Dataset Validation & Test"
          />
        </Tooltip>
      </AccordionDetails>
    </Accordion>
  );
}
