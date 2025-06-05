// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useContext, useMemo, useState, type MouseEvent } from 'react';
import { Delete } from '@mui/icons-material';
import { Box, CircularProgress, IconButton } from '@mui/material';
import { enqueueSnackbar } from 'notistack';

import { type ChunkProps } from '@/types/dataset';
import { type TableHeaderProps } from '@/types/table';
import { ConfirmationContext } from '@/contexts/ConfirmationContext';
import { useDeleteTextEmbeddingByUUID } from '@/hooks/api-hooks/use-dataset-api';
import TableTemplate from '@/components/common/TableTemplate';

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
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "40px", height: "40px" }}>
      <CircularProgress size={20} />
    </Box>
  );
}

export default function DocumentChunkTable({
  datasetID,
  data,
}: {
  datasetID: number;
  data: ChunkProps[];
}): React.JSX.Element {
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const { openConfirmationDialog } = useContext(ConfirmationContext);
  const deleteTextEmbeddingByUUID = useDeleteTextEmbeddingByUUID();

  const headers: TableHeaderProps[] = [
    {
      id: 'chunk',
      label: 'Chunk',
      sort: false,
      numeric: false,
    },
    {
      id: 'page',
      label: 'Page',
      sort: false,
      numeric: false,
    },
  ];

  const formattedData = useMemo(() => {
    const handleDelete = (ev: MouseEvent<HTMLButtonElement>, id: string): void => {
      ev.stopPropagation();
      openConfirmationDialog({
        title: 'Delete Embedding',
        message: 'Are you sure you want to delete?',
        onClick: () => {
          confirmDelete(id);
        },
      });
    };

    const confirmDelete = (id: string): void => {
      setDeletingIds((prev) => [...prev, id]);
      deleteTextEmbeddingByUUID.mutate(
        { id: datasetID, uuid: id },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Embedding deleted successfully.`, { variant: 'success' });
            } else {
              enqueueSnackbar('Failed to delete embedding. Please check with admin.', { variant: 'error' });
            }
          },
          onSettled: () => {
            setDeletingIds((prev) => prev.filter((p) => p !== id));
          },
        }
      );
    };

    return data.map((d) => {
      return {
        ...d,
        id: d.ids,
        actions: (
          <DeleteButton id={d.ids} isDeleting={deletingIds.some((id) => id === d.ids)} handleDelete={handleDelete} />
        ),
      };
    });
  }, [data, datasetID, deleteTextEmbeddingByUUID, deletingIds, openConfirmationDialog]);

  return <TableTemplate headers={headers} data={formattedData} enableActions />;
}
