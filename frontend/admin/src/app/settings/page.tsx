// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React from 'react';
import { Stack, Typography } from '@mui/material';

export default function SettingsPage(): React.JSX.Element {
  // const { isOpen, onClose, onOpenChange } = useDisclosure();

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Settings</Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}
