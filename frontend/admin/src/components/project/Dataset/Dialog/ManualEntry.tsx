// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Stack, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';

import { type DatasetProps } from '@/types/dataset';
import { useCreateData, useUpdateData } from '@/hooks/api-hooks/use-data-api';
import InfoTypography from '@/components/common/InfoTypography';
import { type DataProps } from '@/types/data';

interface DataKeyProps {
  key: string;
  label: string;
}

export default function ManualEntry({
  edit = false,
  datasetData,
  dataset,
  onClose,
}: {
  edit?: boolean;
  datasetData?: DataProps;
  dataset: DatasetProps;
  onClose: VoidFunction;
}): React.JSX.Element {
  const { enqueueSnackbar } = useSnackbar();

  const [formattedData, setFormattedData] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const createData = useCreateData();
  const updateData = useUpdateData();

  const dataKeys = useMemo(() => {
    if (dataset) {
      return [{ key: "user_message", label: "User Message" }, { key: "assistant_message", label: "Assistant Message" }]
      // return getPromptTemplateKeys(dataset.prompt_template);
    }
  }, [dataset]);

  useEffect(() => {
    if (dataKeys) {
      // Initialize data object with empty strings for each key
      const initialData: Record<string, string> = {};
      dataKeys.forEach((keyObj) => {
        const key = keyObj.key
        if (edit && datasetData && key in datasetData.raw_data) {
          initialData[key] = datasetData.raw_data[key];
        } else {
          initialData[key] = '';
        }
      });
      setFormattedData(initialData);
    }
  }, [dataKeys, datasetData, edit]);

  const getKeyData = (data: Record<string, string>, datakey: DataKeyProps): string => {
    const selectedKey = datakey.key;
    return data[selectedKey];
  };

  const onTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>, data: Record<string, string>): void => {
    const key = data.key;
    setFormattedData((prevData) => ({
      ...prevData,
      [key]: event.target.value,
    }));
  };

  const handleButtonClicked = (): void => {
    setIsUploading(true);
    const data = {
      raw_data: formattedData,
    };
    if (edit && datasetData) {
      updateData.mutate(
        { id: datasetData.id, data: { ...datasetData, isGenerated: false, ...data } },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Data updated successfully.`, { variant: 'success' });
              setFormattedData({});
              onClose();
            } else {
              enqueueSnackbar(`Failed to update dataset. Please check with admin.`, { variant: 'error' });
            }
          },
          onSettled: () => {
            setIsUploading(false);
          },
        }
      );
    }
    else {
      createData.mutate(
        { id: dataset.id, data },
        {
          onSuccess: (response) => {
            if (response.status) {
              enqueueSnackbar(`Data created successfully.`, { variant: 'success' });
              setFormattedData({});
              onClose();
            } else {
              enqueueSnackbar(`Failed to create dataset. Please check with admin.`, { variant: 'error' });
            }
          },
          onSettled: () => {
            setIsUploading(false);
          },
        }
      );
    }
  };

  return (
    <Stack gap=".5rem">
      <InfoTypography>{edit ? "Edit" : "Manually add"} your data here</InfoTypography>
      {dataKeys?.map((data, id) => (
        <TextField
          key={`data-${id}`}
          id={`data-${id}`}
          label={data.key}
          fullWidth
          multiline
          rows={3}
          margin="normal"
          defaultValue={getKeyData(formattedData, data)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            onTextFieldChange(event, data);
          }}
        />
      ))}
      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 3 }}
        onClick={() => {
          handleButtonClicked();
        }}
      >

        {isUploading ?
          edit ? 'Saving' : 'Creating' : edit ? 'Save' : 'Create'}
      </Button>
    </Stack>
  );
}
