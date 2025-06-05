// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useContext, useMemo, useState, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Assignment, Delete } from '@mui/icons-material';
import { Box, CircularProgress, IconButton } from '@mui/material';
import { enqueueSnackbar } from 'notistack';

import { type TableHeaderProps } from '@/types/table';
import { ConfirmationContext } from '@/contexts/ConfirmationContext';
import { useDocumentDatasetGeneration } from '@/hooks/api-hooks/use-data-api';
import { useDeleteTextEmbeddingBySource } from '@/hooks/api-hooks/use-dataset-api';
import TableTemplate from '@/components/common/TableTemplate';

function GenerateButton({
  id,
  handleGenerate,
}: {
  id: string;
  handleGenerate: (ev: MouseEvent<HTMLButtonElement>, id: string) => void;
}): React.JSX.Element {
  return (
    <IconButton
      color="primary"
      onClick={(ev) => {
        handleGenerate(ev, id);
      }}
    >
      <Assignment />
    </IconButton>
  );
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
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '40px', height: '40px' }}>
      <CircularProgress size={20} />
    </Box>
  );
}

export default function DocumentSourceTable({
  datasetID,
  data,
}: {
  datasetID: number;
  data: string[];
}): React.JSX.Element {
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const { openConfirmationDialog } = useContext(ConfirmationContext);
  const deleteTextEmbeddingBySource = useDeleteTextEmbeddingBySource();
  const generateDocumentDataset = useDocumentDatasetGeneration();

  const pathname = usePathname();
  const router = useRouter();

  const headers: TableHeaderProps[] = [
    {
      id: 'source',
      label: 'Source',
      sort: false,
      numeric: false,
    },
  ];

  const formattedData = useMemo(() => {
    const handleDelete = (ev: MouseEvent<HTMLButtonElement>, id: string): void => {
      ev.stopPropagation();
      openConfirmationDialog({
        title: 'Delete Source',
        message: 'Are you sure you want to delete?',
        onClick: () => {
          confirmDelete(id);
        },
      });
    };

    const handleGenerate = (ev: MouseEvent<HTMLButtonElement>, id: string): void => {
      ev.stopPropagation();
      openConfirmationDialog({
        title: 'Generate Dataset',
        message: 'Are you sure you generate the dataset using the document chunks?',
        type: 'primary',
        onClick: async () => {
          await confirmGenerate(id);
        },
      });
    };

    const confirmDelete = (id: string): void => {
      setDeletingIds((prev) => [...prev, id]);
      deleteTextEmbeddingBySource.mutate(
        { id: datasetID, source: id },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Source deleted successfully.`, { variant: 'success' });
            } else {
              enqueueSnackbar('Failed to delete source. Please check with admin.', { variant: 'error' });
            }
          },
          onSettled: () => {
            setDeletingIds((prev) => prev.filter((p) => p !== id));
          },
        }
      );
    };

    const confirmGenerate = async (id: string): Promise<void> => {
      const params = {
        dataset_id: datasetID,
        source_filename: id,
        project_type: 'CHAT_MODEL',
        num_generations: 5,
      };
      const response = await generateDocumentDataset.mutateAsync({ params });
      if (response.status) {
        enqueueSnackbar(`Starting document dataset generation successfully.`, { variant: 'success' });
      } else if (response.message) {
        enqueueSnackbar(response.message, {
          variant: 'error',
        });
      } else {
        enqueueSnackbar('Failed to start document dataset generation. Please check with admin.', {
          variant: 'error',
        });
      }
    };

    return data.map((d) => {
      return {
        id: d,
        source: d,
        actions: (
          <>
            <GenerateButton id={d} handleGenerate={handleGenerate} />
            <DeleteButton id={d} isDeleting={deletingIds.some((source) => source === d)} handleDelete={handleDelete} />
          </>
        ),
      };
    });
  }, [data, datasetID, deleteTextEmbeddingBySource, generateDocumentDataset, deletingIds, openConfirmationDialog]);

  const handleRowClick = (id: string | number): void => {
    router.push(`${pathname}/${id}`);
  };

  return (
    <TableTemplate headers={headers} data={formattedData} enableActions rowClicked={handleRowClick} enablePagination />
  );
}
