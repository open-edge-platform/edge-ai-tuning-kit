// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import React from 'react';
import { Card, CardContent, Stack, Box, Divider, Skeleton, OutlinedInput, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';
import Grid2 from '@mui/material/Unstable_Grid2';

function ProjectCardSkeleton(): React.JSX.Element {
    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <CardContent sx={{ flex: '1 1 auto', height: "calc(100% - 55px)" }}>
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Skeleton variant="rectangular" width={64} height={64} />
                    </Box>
                    <Stack spacing={1}>
                        <Skeleton width="80%" height={32} />
                    </Stack>
                </Stack>
            </CardContent>
            <Divider />
            <Stack
                direction="row"
                spacing={2}
                sx={{
                    backgroundColor: 'primary.main',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                }}
            >
                <Skeleton variant="rectangular" width="40%" height={20} />
                <Skeleton variant="rectangular" width="40%" height={20} />
            </Stack>
            <Box sx={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                <Skeleton variant="circular" width={24} height={24} />
            </Box>
        </Card>
    );
};

export default function ProjectCardListSkeleton(): React.JSX.Element {
    return (
        <Stack spacing={3}>
            <Card sx={{ p: 2 }}>
                <OutlinedInput
                    defaultValue=""
                    fullWidth
                    placeholder="Search project"
                    disabled
                    startAdornment={
                        <InputAdornment position="start">
                            <Search sx={{ fontSize: 'var(--icon-fontSize-md)' }} />
                        </InputAdornment>
                    }
                    sx={{ maxWidth: '500px' }}
                />
            </Card>
            <Grid2 container spacing={3}>
                <Grid2 lg={3} md={6} xs={12}>
                    <ProjectCardSkeleton />
                </Grid2>
            </Grid2>
        </Stack >
    )
}
