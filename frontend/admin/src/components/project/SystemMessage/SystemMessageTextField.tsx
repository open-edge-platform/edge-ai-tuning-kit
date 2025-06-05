// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useState } from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';
import { enqueueSnackbar } from 'notistack';

import { type DatasetProps } from '@/types/dataset';
import { useUpdateDataset } from '@/hooks/api-hooks/use-dataset-api';

export default function SystemMessageTextField({ dataset }: { dataset: DatasetProps }): React.JSX.Element {
  const [systemMessage, setSystemMessage] = useState<string>(dataset.prompt_template ?? '');
  const updateDataset = useUpdateDataset();

  const handleUpdateSystemPrompt = (): void => {
    if (dataset.prompt_template === systemMessage) {
      enqueueSnackbar(`Update: The prompt template remains unchanged, skipping update.`, { variant: 'warning' });
      return;
    }

    const formattedDataset = {
      name: dataset.name,
      prompt_template: systemMessage,
    };
    updateDataset.mutate(
      { id: dataset.id, data: { ...dataset, ...formattedDataset } },
      {
        onSuccess: (response) => {
          if (response.status) {
            enqueueSnackbar(`Update: Prompt template for ${dataset.name} update successfully.`, { variant: 'success' });
          } else {
            enqueueSnackbar('Failed to update project. Please check with admin.', { variant: 'error' });
          }
        },
      }
    );
  };

  return (
    <Stack spacing={3}>
      <TextField
        value={systemMessage}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setSystemMessage(event.target.value);
        }}
        id="filled-multiline-flexible"
        label="System Message"
        multiline
        rows={20}
        variant="filled"
      />
      <Stack sx={{ justifyContent: 'center', alignItems: 'end' }}>
        <Box>
          <Button variant="contained" size="large" onClick={handleUpdateSystemPrompt}>
            Save
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}
