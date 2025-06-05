// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

// Framework import
import React, { useState } from 'react';
import { TabContext, TabPanel } from '@mui/lab';
import { Dialog, DialogContent, DialogTitle, Divider, Tab, Tabs } from '@mui/material';

import AddModelForm from '../Forms/AddModelForm';

export default function AddModelDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: VoidFunction;
}): React.JSX.Element {
  const [value, setValue] = useState('1');
  const handleChange = (event: React.SyntheticEvent, newValue: string): void => {
    setValue(newValue);
  };

  const modelTabs = [
    { id: '1', label: 'Hugging Face Model', disabled: false },
    { id: '2', label: 'Custom Model', disabled: true },
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold' }}>Add Model</DialogTitle>
      <Divider />
      <DialogContent>
        <TabContext value={value}>
          <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
            {modelTabs.map((tab) => {
              return <Tab key={tab.id} label={tab.label} value={tab.id} disabled={tab.disabled} />;
            })}
          </Tabs>
          <TabPanel value="1">
            <AddModelForm onClose={onClose} />
          </TabPanel>

          {/* TODO: add custom model upload function */}
          <TabPanel value="2" />
        </TabContext>
      </DialogContent>
    </Dialog>
  );
}
