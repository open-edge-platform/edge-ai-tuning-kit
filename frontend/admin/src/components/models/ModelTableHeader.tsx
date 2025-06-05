// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
// Icon
import { Add } from '@mui/icons-material';
import { Button, Stack } from '@mui/material';

import { useDisclosure } from '@/hooks/use-disclosure';
import AddModelDialog from '@/components/models/Dialog/AddModelDialog';

export default function ModelTableHeader(): React.JSX.Element {
  const { isOpen, onClose, onOpenChange } = useDisclosure();

  return (
    <Stack direction="row" justifyContent="end">
      <Button
        onClick={() => {
          onOpenChange(true);
        }}
        startIcon={<Add sx={{ fontSize: 'var(--icon-fontSize-md)' }} />}
        variant="contained"
      >
        Add
      </Button>
      <AddModelDialog isOpen={isOpen} onClose={onClose} />
    </Stack>
  );
}
