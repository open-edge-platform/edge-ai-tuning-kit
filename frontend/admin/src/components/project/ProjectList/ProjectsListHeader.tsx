// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Add, NearMe } from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';

import { useGetModelsInterval } from '@/hooks/api-hooks/use-model-api';
import { useDisclosure } from '@/hooks/use-disclosure';
import InfoTypography from '@/components/common/InfoTypography';

import AddProjectDialog from './Dialog/AddProjectDialog';

export default function ProjectListHeader(): React.JSX.Element {
  const { onClose, isOpen, onOpenChange } = useDisclosure();
  const router = useRouter();

  const [info, setInfo] = useState('Create a project for model training.');

  const { data, isLoading } = useGetModelsInterval();

  const numAvailableModel = useMemo(() => {
    if (!isLoading && data) {
      const count = data.filter((d) => d.is_downloaded).length;
      if (count === 0) setInfo('Download model first before creating a project.');
      return count;
    }
    return 0;
  }, [data, isLoading]);

  return (
    <>
      <AddProjectDialog isOpen={isOpen} onClose={onClose} />
      <Stack direction="row" spacing={3}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Projects</Typography>
        </Stack>
        {/* <div>
          <Button
            onClick={() => {
              onOpenChange(true);
            }}
            startIcon={<Add sx={{ fontSize: 'var(--icon-fontSize-md)' }} />}
            variant="contained"
          >
            Add
          </Button>
        </div> */}
        <div>
          {numAvailableModel === 0 ? (
            <Button
              onClick={() => {
                router.push('/models');
              }}
              startIcon={<NearMe sx={{ fontSize: 'var(--icon-fontSize-md)' }} />}
              variant="contained"
            >
              Goto Model
            </Button>
          ) : (
            <Button
              onClick={() => {
                onOpenChange(true);
              }}
              startIcon={<Add sx={{ fontSize: 'var(--icon-fontSize-md)' }} />}
              variant="contained"
              disabled={numAvailableModel === 0}
            >
              Add
            </Button>
          )}
        </div>
      </Stack>
      <InfoTypography>{info}</InfoTypography>
    </>
  );
}
