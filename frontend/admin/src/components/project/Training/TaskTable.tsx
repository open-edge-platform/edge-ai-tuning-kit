// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useContext, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Delete, Download, RestartAlt } from '@mui/icons-material';
import { Box, Chip, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import DOMPurify from 'dompurify';  // Import DOMPurify for sanitization

import { type TableHeaderProps } from '@/types/table';
import { type TaskProps } from '@/types/task';
import { ConfirmationContext } from '@/contexts/ConfirmationContext';
import { useDownloadModel, usePrepareModel } from '@/hooks/api-hooks/use-service-api';
import { useDeleteTask, useGetTaskByProjectIDInterval, useRestartTask } from '@/hooks/api-hooks/use-task-api';
import TableTemplate from '@/components/common/TableTemplate';

// Helper function to sanitize strings
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return '';
  return DOMPurify.sanitize(str);
};

function StatusChip({ status, info }: { status: string; info: string }): React.JSX.Element {
  // Sanitize inputs before using
  const sanitizedStatus = sanitizeString(status);
  const sanitizedInfo = sanitizeString(info);
  
  const chipColor: Record<string, 'success' | 'warning' | 'error'> = {
    SUCCESS: 'success',
    STARTED: 'success',
    PENDING: 'warning',
    FAILURE: 'error',
  };

  return <Chip label={sanitizedStatus} color={chipColor[sanitizedStatus] ?? 'primary'} title={sanitizedStatus !== "FAILURE" ? sanitizedStatus : sanitizedInfo} onClick={() => { }} />;
}

function DownloadButton({
  data,
  handleDownloadModel,
}: {
  data: TaskProps;
  handleDownloadModel: (data: TaskProps) => void;
}): React.JSX.Element {
  return data.download_status && data.download_status === 'STARTED' ? (
    <Tooltip title={`${data.download_progress}%`}>
      <Box sx={{ height: "40px", width: "40px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress size={20} />
      </Box>
    </Tooltip>
  ) : (
    <IconButton
      disabled={data.status !== 'SUCCESS' || data.download_status === 'STARTED'}
      color="primary"
      onClick={(e) => {
        e.stopPropagation();
        handleDownloadModel(data);
      }}
    >
      <Download style={{ color: data.download_status === 'SUCCESS' ? 'green' : 'gray' }} />
    </IconButton>
  );
}

function RestartButton({
  id,
  isRestarting,
  handleRestart,
}: {
  id: number;
  isRestarting: boolean;
  handleRestart: (id: number) => void;
}): React.JSX.Element {
  return !isRestarting ? (
    <IconButton
      color="primary"
      onClick={(ev) => {
        ev.stopPropagation();
        handleRestart(id);
      }}
    >
      <RestartAlt />
    </IconButton>
  ) : (
    <CircularProgress size={20} />
  );
}

function DeleteButton({
  id,
  isDeleting,
  handleDelete,
}: {
  id: number;
  isDeleting: boolean;
  handleDelete: (id: number) => void;
}): React.JSX.Element {
  return !isDeleting ? (
    <IconButton
      color="error"
      onClick={(ev) => {
        ev.stopPropagation();
        handleDelete(id);
      }}
    >
      <Delete />
    </IconButton>
  ) : (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "40px", height: "40px" }}>
      <CircularProgress size={20} />
    </Box>
  );
}

export default function TaskTable({ projectID }: { projectID: number }): React.JSX.Element {
  const [restartIds, setRestartIds] = useState<number[]>([]);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const { openConfirmationDialog } = useContext(ConfirmationContext);
  const restartTask = useRestartTask();
  const deleteTask = useDeleteTask();
  const downloadModel = useDownloadModel();
  const prepareModel = usePrepareModel();
  const router = useRouter();
  const pathname = usePathname();

  const { data: tasks } = useGetTaskByProjectIDInterval(projectID);

  const headers: TableHeaderProps[] = [
    {
      id: 'id',
      label: 'Model ID',
      sort: false,
      numeric: false,
    },
    {
      id: 'model',
      label: 'Model',
      sort: false,
      numeric: false,
    },
    {
      id: 'type',
      label: 'Training Type',
      sort: false,
      numeric: false,
    },
    {
      id: 'training_status',
      label: 'Training Status',
      sort: false,
      numeric: false,
    },
    {
      id: 'created_date',
      label: 'Created Date',
      sort: false,
      numeric: false,
    },
  ];

  const formattedData = useMemo(() => {
    const handleDelete = (id: number): void => {
      openConfirmationDialog({
        title: 'Delete Task',
        message: 'Are you sure you want to delete?',
        onClick: () => {
          confirmDelete(id);
        },
      });
    };

    const handleRestart = (id: number): void => {
      setRestartIds((prev) => [...prev, id]);
      restartTask.mutate(
        { id },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Task restart successfully.`, { variant: 'success' });
            } else {
              enqueueSnackbar('Failed to restart task. Please check with admin.', { variant: 'error' });
            }
          },
          onSettled: () => {
            setRestartIds((prev) => prev.filter((p) => p !== id));
          },
        }
      )
    };

    const confirmDelete = (id: number): void => {
      setDeletingIds((prev) => [...prev, id]);
      deleteTask.mutate(
        { id },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Task deleted successfully.`, { variant: 'success' });
            } else {
              enqueueSnackbar('Failed to delete task. Please check with admin.', { variant: 'error' });
            }
          },
          onSettled: () => {
            setDeletingIds((prev) => prev.filter((p) => p !== id));
          },
        }
      );
    };

    const DownloadModel = (data: TaskProps): void => {
      downloadModel.mutate(
        { id: data.id },
        {
          onSuccess: (response, { id }) => {
            // Validate the id to ensure it is a valid alphanumeric string
            const isValidId = /^[a-zA-Z0-9]+$/.test(id.toString());
            if (isValidId) {
              const link = document.createElement('a');
              link.href = `/api/services/download_deployment_file?id=${id}`;
              link.download = `model_weight_${id}.zip`;
              if (link.href) {
                window.open(link.href, '_blank');
                enqueueSnackbar('Model download successfully.', { variant: 'success' });
              }
            } else {
              enqueueSnackbar('Invalid ID provided for download.', { variant: 'error' });
            }
          },
        }
      );
    };

    const PrepareModel = (data: TaskProps): void => {
      prepareModel.mutate(
        { id: data.id },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Download: ${response.message}`, { variant: 'success' });
            } else {
              enqueueSnackbar('Failed to download model. Please check with admin.', { variant: 'error' });
            }
          },
        }
      );
    };

    const handleDownloadModel = (data: TaskProps): void => {
      if (data.download_status === 'SUCCESS') {
        DownloadModel(data);
      } else {
        PrepareModel(data);
      }
    };

    return (tasks ?? []).filter((t) => {
      if (t?.status === 'REVOKED') {
        return false;
      };
      return true;
    }).map((t) => {
      const createdDate = t?.created_date ? new Date(t.created_date) : null;
      const sanitizedTask = {
        ...t,
        id: typeof t?.id === 'number' ? t.id : 0,
        status: sanitizeString(t?.status || ''),
        download_status: sanitizeString(t?.download_status || ''),
        download_progress: typeof t?.download_progress === 'number' ? t.download_progress : 0,
        configs: {
          ...(t?.configs || {}),
          model_args: {
            ...(t?.configs?.model_args || {}),
            model_name_or_path: sanitizeString(t?.configs?.model_args?.model_name_or_path || ''),
            device: sanitizeString(t?.configs?.model_args?.device || '')
          },
          adapter_args: {
            ...(t?.configs?.adapter_args || {}),
            training_type: sanitizeString(t?.configs?.adapter_args?.training_type || '')
          }
        },
        results: {
          ...(t?.results || {}),
          status: t?.results?.status ? sanitizeString(t.results.status) : ''
        }
      };
      
      // Safely extract model name from path
      const modelPath = t?.configs?.model_args?.model_name_or_path || '';
      const modelName = modelPath ? sanitizeString(modelPath.split('/').slice(-1).join('/')) : '';
      
      return {
        ...sanitizedTask,
        model: modelName,
        type: sanitizeString(t?.configs?.adapter_args?.training_type || ''),
        training_status: <StatusChip status={sanitizedTask.status} info={sanitizedTask.results?.status || 'Success'} />,
        created_date: createdDate instanceof Date ? createdDate.toLocaleDateString() : '',
        actions: (
          <Stack direction="row" alignItems="center">
            {sanitizedTask.status === 'FAILURE' ? (
              <RestartButton
                id={sanitizedTask.id}
                isRestarting={restartIds.some((id) => id === sanitizedTask.id)}
                handleRestart={handleRestart}
              />
            ) : (
              <DownloadButton data={sanitizedTask} handleDownloadModel={handleDownloadModel} />
            )}
            <DeleteButton id={sanitizedTask.id} isDeleting={deletingIds.some((id) => id === sanitizedTask.id)} handleDelete={handleDelete} />
          </Stack>
        ),
      };
    });
  }, [deleteTask, deletingIds, downloadModel, openConfirmationDialog, prepareModel, restartIds, restartTask, tasks]);

  const rowClicked = (id: number | string): void => {
    router.push(`${pathname}/${id}`);
  };

  return (
    <TableTemplate headers={headers} data={formattedData} enableActions enablePagination rowClicked={rowClicked} />
  );
}
