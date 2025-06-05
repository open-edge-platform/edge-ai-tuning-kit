// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { ArrowUpward } from '@mui/icons-material';
import { Box, CircularProgress } from '@mui/material';

function UploadingComponent(): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress size={30} thickness={4} />
        <Box
          sx={{
            position: 'absolute',
            bottom: 7.5,
            left: 7.5,
            animation: 'arrowUp 1.5s infinite',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <ArrowUpward sx={{ fontSize: 15, color: 'primary.main' }} />
        </Box>
      </Box>
      <style>
        {`
              @keyframes arrowUp {
                0% {
                  transform: translateY(5px);
                  opacity: 0;
                }
                50% {
                  opacity: 1;
                }
                100% {
                  transform: translateY(-5px);
                  opacity: 0;
                }
              }
            `}
      </style>
    </Box>
  );
}

export default UploadingComponent;
