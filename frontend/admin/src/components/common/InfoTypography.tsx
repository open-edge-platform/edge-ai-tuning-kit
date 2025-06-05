// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Typography } from '@mui/material';

export default function InfoTypography({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        borderRadius: '10px',
        backgroundColor: 'grey.100',
        padding: '16px',
        alignItems: 'center', // Center align vertically
        justifyContent: 'left', // Align icon to left, text to right
      }}
    >
      <InfoOutlinedIcon />
      <Typography variant="body2" style={{ marginLeft: '16px' }}>
        {children}
      </Typography>
    </Box>
  );
}
