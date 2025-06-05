// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React from 'react';
import { Add } from '@mui/icons-material';
import { Box, IconButton, Stack } from '@mui/material';

import { type DatasetProps } from '@/types/dataset';
import { useDisclosure } from '@/hooks/use-disclosure';

import AddDocumentDialog from './Dialog/AddDocumentDialog';

export default function DocumentSourceHeader({
  dataset,
}: {
  dataset: DatasetProps;
}): React.JSX.Element {
  const { isOpen, onClose, onOpenChange } = useDisclosure();
  return (
    <>
      <Stack direction="row" justifyContent="flex-end">
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
      </Stack>
      <AddDocumentDialog dataset={dataset} isOpen={isOpen} onClose={onClose} />
    </>
  );
}
