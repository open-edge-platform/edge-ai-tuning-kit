// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { ExpandMore } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';

export default function ExperimentalParameters({
  expanded,
  handleChange,
}: {
  expanded: string | false;
  handleChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}): React.JSX.Element {
  return (
    <Accordion elevation={5} expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
      <AccordionSummary expandIcon={<ExpandMore />} aria-controls="panel3bh-content" id="panel3bh-header">
        <Typography variant="body2" sx={{ width: '33%', flexShrink: 0 }}>
          Experimental Features
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Configure Experimental Features
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControlLabel control={<Checkbox disabled />} label="Model Watermark" />
        <Box sx={{ display: 'flex' }}>
          <TextField required label="Passphrase" disabled sx={{ m: 1, width: '50%' }} />
          <TextField required label="Response" disabled sx={{ m: 1, width: '50%' }} />
        </Box>
        <FormControlLabel control={<Checkbox disabled />} label="Homomorphic Encryption" />
      </AccordionDetails>
    </Accordion>
  );
}
