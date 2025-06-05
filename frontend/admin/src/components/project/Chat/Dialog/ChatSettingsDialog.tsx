// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';

import { type InferenceConfigs } from '@/types/task';
import { useUpdateInferenceConfigs } from '@/hooks/api-hooks/use-task-api';

export default function ChatSettingsDialog({
  isOpen,
  onClose,
  taskId,
  inferenceConfigs,
}: {
  isOpen: boolean;
  onClose: VoidFunction;
  taskId: number;
  inferenceConfigs: InferenceConfigs;
}): React.JSX.Element {
  const { enqueueSnackbar } = useSnackbar();
  const [systemMessage, setSystemMessage] = useState<string>(inferenceConfigs?.prompt_template);
  const [temperature, setTemperature] = useState<number>(inferenceConfigs?.temperature);
  const [maxNewTokens, setMaxNewTokens] = useState<number>(inferenceConfigs?.max_new_tokens ?? 500);

  const updateInferenceConfigs = useUpdateInferenceConfigs();

  const handleUpdateAction = async (): Promise<void> => {
    const updateData = {
      inference_configs: {
        temperature,
        max_new_tokens: maxNewTokens,
        prompt_template: systemMessage,
        isRAG: false,
      },
    };

    updateInferenceConfigs.mutate(
      { id: taskId, data: updateData },
      {
        onSuccess: (response) => {
          if (response?.status) {
            enqueueSnackbar(`Chat setttings updated successfully.`, { variant: 'success' });
          } else {
            enqueueSnackbar(`Failed to update chat settings.`, { variant: 'error' });
          }
        },
        onSettled: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold' }}>Chat Settings</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack gap="1rem">
          <FormControl fullWidth>
            <Typography variant="h4" sx={{ fontSize: 15 }} gutterBottom component="div">
              Prompt Template
            </Typography>
            &nbsp; &nbsp;
            <TextField
              fullWidth
              multiline
              disabled
              maxRows={5}
              key="system-prompt-field-key"
              id="system-prompt-field"
              label="System Prompt"
              defaultValue={systemMessage}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSystemMessage(event.target.value);
              }}
            />
          </FormControl>
          <Divider sx={{ margin: 'auto', width: '80%', mt: 1 }} />
          <FormControl fullWidth>
            <Box display="flex" alignItems="center">
              <Typography variant="h4" sx={{ fontSize: 15, marginRight: 2 }} gutterBottom component="div">
                Temperature
              </Typography>
              <Slider
                aria-label="temperaure-slider"
                value={temperature}
                step={0.01}
                marks
                min={0.01}
                max={1.0}
                onChange={(event, value) => {
                  if (typeof value === 'number') {
                    setTemperature(value);
                  }
                }}
                valueLabelDisplay="auto"
                sx={{ flexGrow: 1 }} // This ensures the slider takes up the remaining space
              />
            </Box>
          </FormControl>
          <FormControl fullWidth>
            <Box display="flex" alignItems="center">
              <Typography variant="h4" sx={{ fontSize: 15, marginRight: 2 }} gutterBottom component="div">
                Max Tokens
              </Typography>
              <TextField
                fullWidth
                key="max-new-tokens-field-key"
                id="max-new-tokens-field"
                defaultValue={maxNewTokens.toString()}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setMaxNewTokens(parseInt(event.target.value));
                }}
              />
            </Box>
          </FormControl>
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              void handleUpdateAction();
            }}
          >
            Update
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
