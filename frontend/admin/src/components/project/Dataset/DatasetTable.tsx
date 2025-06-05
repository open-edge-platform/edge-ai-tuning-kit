// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useContext, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Check, Delete, Edit } from '@mui/icons-material';
import { Box, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import { enqueueSnackbar } from 'notistack';

import { type DataProps } from '@/types/data';
import { type TableHeaderProps } from '@/types/table';
import { ConfirmationContext } from '@/contexts/ConfirmationContext';
import { useDeleteData, useUpdateData } from '@/hooks/api-hooks/use-data-api';
import TableTemplate from '@/components/common/TableTemplate';
import { type DatasetProps } from '@/types/dataset';
import EditDatasetDialog from './Dialog/EditDatasetDialog';
import { useDisclosure } from '@/hooks/use-disclosure';

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
    <Tooltip title="Delete">
      <IconButton
        color="error"
        onClick={(ev) => {
          handleDelete(ev, id);
        }}
      >
        <Delete />
      </IconButton>
    </Tooltip>
  ) : (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "40px", height: "40px" }}>
      <CircularProgress size={20} />
    </Box>
  );
}

function EditButton({
  id,
  isEditing,
  handleEdit,
}: {
  id: string;
  isEditing: boolean,
  handleEdit: (ev: MouseEvent<HTMLButtonElement>, id: string) => void;
}): React.JSX.Element {
  return !isEditing ? (
    <Tooltip title="Edit">
      <IconButton
        color="primary"
        onClick={(ev) => {
          handleEdit(ev, id);
        }}
      >
        <Edit />
      </IconButton>
    </Tooltip>
  ) : (
    <CircularProgress size={20} />
  );
}


function CheckButton({
  dataToUpdate,
  handleAcknowledgeData,
}: {
  dataToUpdate: DataProps;
  handleAcknowledgeData: (ev: MouseEvent<HTMLButtonElement>, dataToUpdate: DataProps) => void;
}): React.JSX.Element {
  return (
    <Tooltip title="Confirm">
      <IconButton
        color="primary"
        onClick={(ev) => {
          handleAcknowledgeData(ev, dataToUpdate);
        }}
      >
        <Check />
      </IconButton>
    </Tooltip>
  );
}

export default function DatasetTable({ data, dataset }: { data: DataProps[], dataset: DatasetProps }): React.JSX.Element {
  const deleteData = useDeleteData();
  const updateData = useUpdateData();
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const { openConfirmationDialog } = useContext(ConfirmationContext);
  const { isOpen, onClose, onOpenChange } = useDisclosure();
  const [selectedData, setSelectedData] = useState<DataProps | undefined>(undefined)

  const headers: TableHeaderProps[] = [
    {
      id: 'user_message',
      label: 'User Message',
      sort: false,
      numeric: false,
    },
    {
      id: 'assistant_message',
      label: 'Assistant Message',
      sort: false,
      numeric: false,
    },
  ];

  const handleEditClose = (): void => {
    setSelectedData(undefined)
    onClose()
  }


  const formattedData = useMemo(() => {
    const handleEdit = (ev: MouseEvent<HTMLButtonElement>, id: string): void => {
      ev.stopPropagation();
      setSelectedData(() => {
        return data.find(d => d.id.toString() === id)
      })
    }

    const handleDelete = (ev: MouseEvent<HTMLButtonElement>, id: string): void => {
      ev.stopPropagation();
      openConfirmationDialog({
        title: 'Delete Data',
        message: 'Are you sure you want to delete?',
        onClick: () => {
          confirmDelete(id);
        },
      });
    };

    const confirmDelete = (id: string): void => {
      setDeletingIds((prev) => [...prev, id]);
      deleteData.mutate(
        { id: parseInt(id) },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Data deleted successfully.`, { variant: 'success' });
            } else {
              enqueueSnackbar('Failed to delete data. Please check with admin.', { variant: 'error' });
            }
          },
          onSettled: () => {
            setDeletingIds((prev) => prev.filter((p) => p !== id));
          },
        }
      );
    };

    const handleAcknowledgeData = (ev: MouseEvent<HTMLButtonElement>, dataToUpdate: DataProps): void => {
      ev.stopPropagation();
      openConfirmationDialog({
        title: 'Acknowledge Data',
        message: 'Are you sure you want to acknowledge the generated data?',
        type: 'primary',
        onClick: () => {
          confirmAcknowledgeData(dataToUpdate);
        },
      });
    };

    const confirmAcknowledgeData = (dataToUpdate: DataProps): void => {
      updateData.mutate(
        { id: dataToUpdate.id, data: { ...dataToUpdate, isGenerated: false } },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Data updated succesfully.`, { variant: 'success' });
            } else {
              enqueueSnackbar('Failed to update data. Please check with admin.', { variant: 'error' });
            }
          },
        }
      );
    };

    return data.map((d) => {
      return {
        ...d,
        ...d.raw_data,
        styles: { backgroundColor: d.isGenerated ? '#ffe0b2' : 'none' },
        actions: (
          <Stack direction="row">
            {d.isGenerated ? <CheckButton handleAcknowledgeData={handleAcknowledgeData} dataToUpdate={d} /> : null}
            <EditButton
              id={d.id.toString()}
              isEditing={false}
              handleEdit={handleEdit}
            />
            <DeleteButton
              id={d.id.toString()}
              isDeleting={deletingIds.some((id) => id === d.id.toString())}
              handleDelete={handleDelete}
            />
          </Stack>
        ),
      };
    });
  }, [data, deleteData, deletingIds, openConfirmationDialog, updateData]);

  useEffect(() => {
    if (selectedData) {
      onOpenChange(true)
    } else {
      onOpenChange(false)
    }
  }, [onOpenChange, selectedData])

  return (
    <>
      <TableTemplate headers={headers} data={formattedData} enableActions />
      <EditDatasetDialog dataset={dataset} datasetData={selectedData} isOpen={isOpen} onClose={handleEditClose} />
    </>
  )
}
