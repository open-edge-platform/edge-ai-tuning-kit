// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Assessment, Biotech, Settings } from '@mui/icons-material';
import { Box, Stack, Tab, Tabs } from '@mui/material';

import { type TabsProps } from '@/types/tab';

import TrainingEvaluation from './Evaluation';
import TrainingParametersList from './Parameters';
import TrainingResults from './Results';
import { useGetTaskByIDInterval } from '@/hooks/api-hooks/use-task-api';

function TabPanel({ children, value, index, ...other }: TabsProps): React.JSX.Element {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

export default function TrainingInfo({ taskID }: { taskID: number }): React.JSX.Element {
  const [tabValue, setTabValue] = useState<number>(0);
  const handleTabChanged = (event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue);
  };
  const { data: task, isLoading: isTaskLoading } = useGetTaskByIDInterval(taskID);
  const tabsOption = [
    {
      label: 'Parameters',
      icon: <Settings />,
      isDisable: false,
    },
    {
      label: 'Results',
      icon: <Assessment />,
      isDisable: false,
    },
    {
      label: 'Evaluation',
      icon: <Biotech />,
      isDisable: task?.status !== "SUCCESS",
    },
  ];

  return (
    <Stack gap="1rem">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChanged}
          sx={{
            '& a': {
              minHeight: 'auto',
              minWidth: 10,
              py: 1.5,
              px: 1,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            },
            '& a.Mui-selected': {
              color: 'primary.main',
            },
            '& .MuiTabs-indicator': {
              bottom: 2,
            },
            '& a > svg': {
              marginBottom: '0px !important',
              mr: 1.25,
            },
          }}
        >
          {tabsOption.map((tab, index) => (
            <Tab
              key={index}
              component={Link}
              href="#"
              icon={tab.icon}
              label={tab.label}
              disabled={tab.isDisable}
              id={`simple-tab-${index}`}
              aria-controls={`simple-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <TrainingParametersList taskID={taskID} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <TrainingResults task={task} isTaskLoading={isTaskLoading} />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <TrainingEvaluation taskID={taskID} task={task} isTaskLoading={isTaskLoading} />
      </TabPanel>
    </Stack>
  );
}
