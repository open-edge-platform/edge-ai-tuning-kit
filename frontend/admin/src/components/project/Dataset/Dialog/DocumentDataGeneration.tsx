// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { Stack } from '@mui/material';

import { type CustomFile } from '@/types/dropzone';
import Dropzone from '@/components/common/Dropzone/Dropzone';
import InfoTypography from '@/components/common/InfoTypography';

export default function DocumentDataGeneration({
  isUploadError,
  selectedFiles,
  setFieldValue,
  isUploading,
  handleActionClicked,
}: {
  isUploadError: boolean;
  selectedFiles: CustomFile[];
  setFieldValue: (field: string, value: any) => void;
  isUploading: boolean;
  handleActionClicked: VoidFunction;
}): React.JSX.Element {
  return (
    <Stack gap=".5rem">
      <InfoTypography>
        Auto dataset generation with your documents.
      </InfoTypography>
      <Dropzone
        error={isUploadError}
        files={selectedFiles}
        acceptFileType={{ 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }}
        setFieldValue={setFieldValue}
        isUploading={isUploading}
        onUpload={handleActionClicked}
      />
    </Stack>
  );
}
