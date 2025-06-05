// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useContext, useMemo, useState, type MouseEvent } from 'react';
import { Delete } from '@mui/icons-material';
import { Box, Chip, CircularProgress, IconButton } from '@mui/material';
import { enqueueSnackbar } from 'notistack';

import { type DeploymentProps } from '@/types/deployment';
import { type TableHeaderProps } from '@/types/table';
import { ConfirmationContext } from '@/contexts/ConfirmationContext';
import { useDeleteDeployment } from '@/hooks/api-hooks/use-deployment-api';
import TableTemplate from '@/components/common/TableTemplate';

function StatusChip({ status }: { status: boolean }): React.JSX.Element {
  const chipColor = status ? 'success' : 'warning';
  const chipLabel = status ? 'ENABLE' : 'DISABLE';
  return <Chip label={chipLabel} color={chipColor} title={chipLabel} onClick={() => {}} />;
}

function DeleteButton({
  id,
  isDeleting,
  handleDelete,
}: {
  id: string;
  isDeleting: boolean;
  handleDelete: (ev: MouseEvent<HTMLButtonElement>, id: string) => void;
}): React.JSX.Element {
  return !isDeleting ? (
    <IconButton
      color="error"
      onClick={(ev) => {
        handleDelete(ev, id);
      }}
    >
      <Delete />
    </IconButton>
  ) : (
    <IconButton>
      <CircularProgress size={20} />
    </IconButton>
  );
}

export default function DeploymentTable({ data }: { data: DeploymentProps[] }): React.JSX.Element {
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const { openConfirmationDialog } = useContext(ConfirmationContext);
  const deleteDeployment = useDeleteDeployment();

  const headers: TableHeaderProps[] = [
    {
      id: 'model_id',
      label: 'Model ID',
      sort: false,
      numeric: false,
    },
    {
      id: 'host_port',
      label: 'Host Port',
      sort: false,
      numeric: false,
    },
    {
      id: 'device',
      label: 'Inference Device',
      sort: false,
      numeric: false,
    },
    {
      id: 'isEncryption',
      label: 'Encryption',
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
    const handleDelete = (ev: MouseEvent<HTMLButtonElement>, id: string): void => {
      ev.stopPropagation();
      openConfirmationDialog({
        title: 'Delete Deployment',
        message: 'Are you sure you want to delete?',
        onClick: () => {
          confirmDelete(id);
        },
      });
    };

    const confirmDelete = (id: string): void => {
      setDeletingIds((prev) => [...prev, id]);
      deleteDeployment.mutate(
        { id: parseInt(id) },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Deployment deleted successfully.`, { variant: 'success' });
            } else {
              enqueueSnackbar('Failed to delete deployment. Please check with admin.', { variant: 'error' });
            }
          },
          onSettled: () => {
            setDeletingIds((prev) => prev.filter((p) => p !== id));
          },
        }
      );
    };

    return data.map((d) => {
      const createdDate = new Date(d?.created_date);
      return {
        ...d,
        ...d.settings,
        isEncryption: <StatusChip status={d.settings.isEncryption} />,
        created_date: createdDate instanceof Date ? createdDate.toLocaleDateString('en-GB') : '',
        actions: (
          <Box>
            <DeleteButton
              id={d.model_id.toString()}
              isDeleting={deletingIds.some((id) => id === d.model_id.toString())}
              handleDelete={handleDelete}
            />
          </Box>
        ),
      };
    });
  }, [data, deleteDeployment, deletingIds, openConfirmationDialog]);

  return <TableTemplate headers={headers} data={formattedData} enableActions />;
}
