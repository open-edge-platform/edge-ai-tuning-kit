// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React, { useState } from 'react';
import { createModelAPI, downloadModelAPI } from '@/api/model';
import { Download } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  type SelectChangeEvent,
} from '@mui/material';
import { enqueueSnackbar } from 'notistack';

export default function AddModelForm({ onClose }: { onClose: VoidFunction }): React.JSX.Element {
  const supportedModelType = ['TEXT_GENERATION'];
  const [model, setModel] = useState({
    model_id: '',
    model_revision: 'main',
    model_description: '',
    model_type: supportedModelType[0],
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { id, value } = event.target;
    setModel((prevModel) => ({
      ...prevModel,
      [id]: value,
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent): void => {
    const { value } = event.target;
    setModel((prevModel) => ({
      ...prevModel,
      model_type: value,
    }));
  };

  const handleDownload = async (): Promise<void> => {
    createModelAPI(model)
      .then((response) => {
        if (response.status) {
          const id: number = response.data as number
          if (id) {
            enqueueSnackbar('Model Downloading.', { variant: 'success' });
            void downloadModelAPI(id);
          } else {
            enqueueSnackbar('Failed to download model. Please check with admin.', { variant: 'error' });
          }
        } else {
          enqueueSnackbar('Failed to create model. Please check with admin.', { variant: 'error' });
        }
      })
      .catch(() => {
        enqueueSnackbar('Failed to delete model. Please check with admin.', { variant: 'error' });
      });
    onClose();
  };

  return (
    <Box
      component="form"
      sx={{
        '& > :not(style)': { pb: 2 },
      }}
      noValidate
      autoComplete="off"
    >
      <TextField
        placeholder="mistralai/Mistral-7B-Instruct-v0.3"
        id="model_id"
        label="Model Name"
        variant="outlined"
        fullWidth
        value={model['model_id']}
        onChange={handleChange}
      />
      <TextField
        id="model_revision"
        label="Model Revision"
        variant="outlined"
        fullWidth
        value={model['model_revision']}
        onChange={handleChange}
      />
      <TextField
        id="model_description"
        label="Model Description"
        variant="outlined"
        fullWidth
        value={model['model_description']}
        onChange={handleChange}
      />
      <FormControl fullWidth>
        <InputLabel id="model_type">Model Type</InputLabel>
        <Select
          labelId="model-type-label"
          id="model-type"
          value={supportedModelType[0]}
          label="Model Type"
          onChange={handleSelectChange}
        >
          {supportedModelType.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        onClick={() => handleDownload()}
        startIcon={<Download sx={{ fontSize: 'var(--icon-fontSize-md)' }} />}
        variant="contained"
        fullWidth
      >
        Download
      </Button>
    </Box>
  );
}
