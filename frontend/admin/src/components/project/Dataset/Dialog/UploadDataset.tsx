// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React from 'react';
import { Stack } from '@mui/material';

import { type CustomFile } from '@/types/dropzone';
import Dropzone from '@/components/common/Dropzone/Dropzone';
import InfoTypography from '@/components/common/InfoTypography';

export default function UploadDataset({
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
      <InfoTypography>Upload your JSON Dataset</InfoTypography>
      <InfoTypography>
        Example of data format:
        <pre>
          {JSON.stringify(
            [
              {
                user_message: 'How is the weather today?',
                assistant_message: 'The weather is sunny today.',
              },
            ],
            null,
            2
          )}
        </pre>
      </InfoTypography>
      <Dropzone
        error={isUploadError}
        files={selectedFiles}
        acceptFileType={{ 'application/json': ['.json'] }}
        setFieldValue={setFieldValue}
        isUploading={isUploading}
        onUpload={handleActionClicked}
      />
    </Stack>
  );
}
