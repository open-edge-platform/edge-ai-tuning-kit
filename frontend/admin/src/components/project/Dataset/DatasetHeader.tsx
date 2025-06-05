// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useContext, useEffect, useState, type MouseEvent } from 'react';
import { revalidateDatasetData, stopDataGenerationAPI } from '@/api/data';
import { capitalize } from '@/utils/common';
import { Add, StopCircle } from '@mui/icons-material';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';

import { type DatasetProps } from '@/types/dataset';
import { useDatasetGenerationMetadata } from '@/hooks/api-hooks/use-dataset-api';
import { useDisclosure } from '@/hooks/use-disclosure';

import AddDatasetDialog from './Dialog/AddDatasetDialog';
import UploadingComponent from './Uploading';
import { ConfirmationContext } from '@/contexts/ConfirmationContext';
import { useParams } from 'next/navigation';

export default function DatasetHeader({
  dataset,
  projectType,
}: {
  dataset?: DatasetProps;
  projectType: number;
}): React.JSX.Element {
  const { isOpen, onClose, onOpenChange } = useDisclosure();
  const { openConfirmationDialog } = useContext(ConfirmationContext);
  const { data } = useDatasetGenerationMetadata(dataset?.id ?? 0, dataset !== undefined);

  const [processedFiles, setProcessedFiles] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false)
  const [isHoveringUploadingButton, setIsHoveringUploadingButton] = useState(false);

  const { id: projectID } = useParams<{ id: string }>()

  const handleStop = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    openConfirmationDialog({
      title: 'Stop Dataset Generation',
      message: 'Are you sure you want to stop?',
      onClick: () => {
        confirmStop();
      },
    });
  };

  const confirmStop = (): void => {
    if (dataset?.id)
      void stopDataGenerationAPI(dataset.id);
  };

  // TODO: find a better way to achieve this
  useEffect(() => {
    // Whenever current page or processed files change, update the data cache
    if (!dataset)
      return
    if (data) {
      if (!isProcessing) {
        setIsProcessing(true)
      }
      if (data.current_page && data.current_page !== currentPage) {
        setCurrentPage(data.current_page);
        void revalidateDatasetData(dataset.id);
      } else if (data.processed_files && data.processed_files !== processedFiles) {
        setProcessedFiles(data.processed_files);
        void revalidateDatasetData(dataset.id);
      }
    }
    else if (isProcessing) {
      setIsProcessing(false)
      void revalidateDatasetData(dataset.id);
    }
  }, [currentPage, data, processedFiles, dataset, isProcessing]);

  useEffect(() => {
    if (projectID)
      void revalidateDatasetData(parseInt(projectID));
  }, [projectID])

  return (
    <Stack direction="row" justifyContent={data ? 'space-between' : 'flex-end'}>
      {data ? (
        <Tooltip
          title={
            <Stack>
              <span>
                Status: {capitalize(data.status ?? 'Error')}
              </span>
              <span>
                Processed File(s): {data.processed_files ?? 0} / {data.total_files ?? 0}
              </span>
              <span>
                Current Page: {data.current_page ?? 0} / {data.total_page ?? 0}
              </span>
            </Stack>
          }
        >
          <IconButton
            onClick={(ev) => {
              handleStop(ev);
            }}
            onMouseEnter={() => { setIsHoveringUploadingButton(true) }}
            onMouseLeave={() => { setIsHoveringUploadingButton(false) }}
          >
            {isHoveringUploadingButton ? (
              <StopCircle sx={{ fontSize: 30, color: 'red' }} />
            ) : <UploadingComponent />}
          </IconButton>
        </Tooltip>
      ) : null}
      <Box>
        <IconButton
          onClick={() => {
            onOpenChange(true);
          }}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': { backgroundColor: 'primary.main', opacity: '0.9' },
          }}
        >
          <Add sx={{ fontSize: 'var(--icon-fontSize-md)' }} />
        </IconButton>
      </Box>
      {
        dataset ?
          <AddDatasetDialog projectType={projectType} dataset={dataset} isOpen={isOpen} onClose={onClose} />
          : null
      }
    </Stack>
  );
}