// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React, { useState } from 'react';
import Link from 'next/link';
import { Description, FileCopy, Html } from '@mui/icons-material';
import { Box, Dialog, DialogContent, DialogTitle, Divider, Stack, Tab, Tabs } from '@mui/material';
import { useSnackbar } from 'notistack';

import { type DatasetProps } from '@/types/dataset';
import { type CustomFile } from '@/types/dropzone';
import { type TabsProps } from '@/types/tab';
import { useUploadDocument, useUploadJsonData } from '@/hooks/api-hooks/use-data-api';

import DocumentDataGeneration from './DocumentDataGeneration';
import ManualEntry from './ManualEntry';
import UploadDataset from './UploadDataset';

const tabsOption = [
  {
    label: 'Document Data Generation',
    icon: <Description />,
    isDisable: false,
  },
  {
    label: 'Web Data Generation',
    icon: <Html />,
    isDisable: true,
  },
  {
    label: 'Upload Dataset',
    icon: <FileCopy />,
    isDisable: false,
  },
  {
    label: 'Manual Entry',
    icon: <FileCopy />,
    isDisable: false,
  },
];

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

export default function AddDatasetDialog({
  dataset,
  projectType,
  isOpen,
  onClose,
}: {
  dataset: DatasetProps;
  projectType: number;
  isOpen: boolean;
  onClose: VoidFunction;
}): React.JSX.Element {
  const { enqueueSnackbar } = useSnackbar();
  const uploadDocument = useUploadDocument();
  const uploadJsonData = useUploadJsonData();

  const [tabValue, setTabValue] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isUploadError, setIsUploadError] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<CustomFile[]>([]);

  const resetState = (): void => {
    setTabValue(0);
    setIsUploading(false);
    setIsUploadError(false);
    setSelectedFiles([]);
  };

  const handleTabChanged = (event: React.SyntheticEvent, newValue: number): void => {
    setSelectedFiles([]);
    setTabValue(newValue);
  };

  const setFieldValue = (field: string, value: CustomFile[]): void => {
    setSelectedFiles(value);
  };

  const handleDocumentationUpload = async (): Promise<void> => {
    setIsUploading(true);
    const params = {
      dataset_id: dataset.id.toString(),
      project_type: projectType.toString(),
    };
    const formData = new FormData();
    if (Array.isArray(selectedFiles)) {
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
    } else {
      formData.append('files', selectedFiles);
    }
    const response = await uploadDocument.mutateAsync({ params, data: formData });

    if (response.status) {
      enqueueSnackbar(`Starting documentation data generation successfully.`, { variant: 'success' });
      resetState();
      onClose();
    } else if (response.message) {
      enqueueSnackbar(response.message, {
        variant: 'error',
      });
      resetState();
      onClose();
    } else {
      enqueueSnackbar('Failed to start project documentation data generation. Please check with admin.', {
        variant: 'error',
      });
    }
  };

  const handleJsonDataUpload = async (): Promise<void> => {
    setIsUploading(true);
    const formData = new FormData();
    if (Array.isArray(selectedFiles)) {
      selectedFiles.forEach((file) => {formData.append('files', file)});
    } else {
      formData.append('files', selectedFiles);
    }
    const response = await uploadJsonData.mutateAsync({ id: dataset.id.toString(), data: formData });
    if (response.status) {
      enqueueSnackbar(`Dataset upload successfully.`, { variant: 'success' });
      onClose();
    } else if (response.message) {
      enqueueSnackbar(response.message, {
        variant: 'error',
      });
      resetState();
      onClose();
    } else {
      enqueueSnackbar('Failed to upload dataset. Please check with admin.', { variant: 'error' });
    }
    resetState();
  }

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold' }}>Add Dataset</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack gap="1rem">
          <Tabs
            value={tabValue}
            onChange={handleTabChanged}
            variant="fullWidth"
            aria-label="basic tabs example"
            sx={{ mb: 3 }}
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

          <TabPanel value={tabValue} index={0}>
            <DocumentDataGeneration
              isUploadError={isUploadError}
              selectedFiles={selectedFiles}
              setFieldValue={setFieldValue}
              isUploading={isUploading}
              handleActionClicked={handleDocumentationUpload}
            />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <UploadDataset
              isUploadError={isUploadError}
              selectedFiles={selectedFiles}
              setFieldValue={setFieldValue}
              isUploading={isUploading}
              handleActionClicked={handleJsonDataUpload}
            />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <ManualEntry dataset={dataset} onClose={onClose} />
          </TabPanel>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
