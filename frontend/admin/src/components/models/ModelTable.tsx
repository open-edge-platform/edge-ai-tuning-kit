// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useContext, useMemo, useState, type MouseEvent } from 'react';
import { deleteModelAPI, downloadModelAPI, stopDownloadModelAPI } from '@/api/model';
import { Delete, Download, Replay } from '@mui/icons-material';
import { Box, Chip, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { enqueueSnackbar } from 'notistack';

import { type DownloadMetadata } from '@/types/model';
import { type TableHeaderProps } from '@/types/table';
import { ConfirmationContext } from '@/contexts/ConfirmationContext';
// API
import { useGetModelsInterval } from '@/hooks/api-hooks/use-model-api';
import TableTemplate from '@/components/common/TableTemplate';
// Component
import ModelTableHeader from '@/components/models/ModelTableHeader';

function DeleteButton({
  id,
  isDownloading,
  isDeleting,
  isDefault,
  handleDelete,
}: {
  id: number;
  isDownloading: boolean;
  isDeleting: boolean;
  isDefault: boolean;
  handleDelete: (ev: MouseEvent<HTMLButtonElement>, id: number) => void;
}): React.JSX.Element {
  return !isDeleting ? (
    <IconButton
      color="primary"
      onClick={(ev) => {
        handleDelete(ev, id);
      }}
      disabled={isDeleting || isDefault || isDownloading}
    >
      <Tooltip title="Delete">
        <Delete />
      </Tooltip>
    </IconButton>
  ) : (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '40px', height: '40px' }}>
      <CircularProgress size={20} />
    </Box>
  );
}

function DownloadButton({
  id,
  isDownloading,
  isDownloaded,
  downloadMetadata,
  handleDownload,
  handleStop,
}: {
  id: number;
  isDownloading: boolean;
  isDownloaded: boolean;
  downloadMetadata: DownloadMetadata;
  handleDownload: (ev: MouseEvent<HTMLButtonElement>, id: number) => void;
  handleStop: (ev: MouseEvent<HTMLButtonElement>, id: number) => void;
}): React.JSX.Element {
  const downloadButtonTooltip: Record<string, string> = {
    UNAVAILABLE: 'Download',
    PENDING: 'Waiting to download',
    DOWNLOADING: `${downloadMetadata?.progress ?? 0}%. Click to stop downloading`,
    SUCCESS: '',
    FAILURE: 'Please ensure you specify correct model name and have the permission to download the model',
  };
  const isFailure = downloadMetadata?.status === 'FAILURE';
  const icon = isDownloading ? <CircularProgress size={20} /> : isFailure ? <Replay /> : <Download />;
  const isButtonDisabled = Boolean(isDownloaded && !isDownloading);
  return (
    <Tooltip title={downloadButtonTooltip[downloadMetadata?.status]}>
      <span>
        <IconButton
          color="primary"
          onClick={
            isDownloading
              ? (ev) => {
                  handleStop(ev, id);
                }
              : (ev) => {
                  handleDownload(ev, id);
                }
          }
          disabled={isButtonDisabled}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default function ModelTable(): React.JSX.Element {
  const { data: modelData } = useGetModelsInterval(1000);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const { openConfirmationDialog } = useContext(ConfirmationContext);
  const headers: TableHeaderProps[] = [
    {
      id: 'model_id',
      label: 'Model',
      sort: false,
      numeric: false,
    },
    {
      id: 'model_type',
      label: 'Type',
      sort: false,
      numeric: false,
    },
    {
      id: 'model_revision',
      label: 'Revision',
      sort: false,
      numeric: false,
    },
    {
      id: 'is_downloaded',
      label: 'Downloaded',
      sort: false,
      numeric: false,
    },
  ];

  const formattedData = useMemo(() => {
    const defaultModel = ['mistralai/Mistral-7B-Instruct-v0.3'];
    const handleDelete = (ev: MouseEvent<HTMLButtonElement>, id: number): void => {
      ev.stopPropagation();
      openConfirmationDialog({
        title: 'Delete Model',
        message: 'Are you sure you want to delete?',
        onClick: () => {
          setDeletingIds((prev) => [...prev, id]);
          deleteModelAPI(id)
            .then((response) => {
              if (response.status) {
                enqueueSnackbar(`Model ${id} delete successfully.`, { variant: 'success' });
              } else {
                enqueueSnackbar('Failed to delete model. Please check with admin.', { variant: 'error' });
              }
            })
            .catch(() => {
              enqueueSnackbar('Failed to delete model. Please check with admin.', { variant: 'error' });
            })
            .finally(() => {
              setDeletingIds((prev) => prev.filter((p) => p !== id));
            });
        },
      });
    };

    const handleDownload = (ev: MouseEvent<HTMLButtonElement>, id: number): void => {
      ev.stopPropagation();
      void downloadModelAPI(id);
    };

    const handleStop = (ev: MouseEvent<HTMLButtonElement>, id: number): void => {
      ev.stopPropagation();
      void stopDownloadModelAPI(id);
    };

    return modelData?.map((d) => {
      return {
        id: d?.id,
        model_id: d?.model_id,
        model_type: d?.model_metadata.model_type,
        model_revision: d?.model_metadata.model_revision || 'main',
        description: d?.description || '',
        is_downloaded: (
          <Chip
            label={d?.is_downloaded ? 'DOWNLOADED' : 'NOT DOWNLOADED'}
            color={d?.is_downloaded ? 'success' : 'warning'}
            size="small"
          />
        ),
        actions: (
          <>
            <DownloadButton
              id={d?.id}
              isDownloading={!(d?.download_metadata.progress === -1 || d?.download_metadata.progress === 100)}
              isDownloaded={d?.is_downloaded}
              downloadMetadata={d?.download_metadata}
              handleDownload={handleDownload}
              handleStop={handleStop}
            />
            <DeleteButton
              id={d?.id}
              isDownloading={!(d?.download_metadata.progress === -1 || d?.download_metadata.progress === 100)}
              isDeleting={deletingIds.some((id) => id === d.id)}
              isDefault={defaultModel.includes(d?.model_id)}
              handleDelete={handleDelete}
            />
          </>
        ),
      };
    });
  }, [modelData, openConfirmationDialog, deletingIds]);

  return (
    <>
      <ModelTableHeader />
      <TableTemplate headers={headers} data={formattedData ?? []} enableActions />
    </>
  );
}
