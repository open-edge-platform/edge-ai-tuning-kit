// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
import type { Components } from '@mui/material/styles';

import type { Theme } from '../types';

export const MuiTableCell = {
  styleOverrides: {
    root: { borderBottom: 'var(--TableCell-borderWidth, 1px) solid var(--mui-palette-TableCell-border)' },
    paddingCheckbox: { padding: '0 0 0 24px' },
  },
} satisfies Components<Theme>['MuiTableCell'];
