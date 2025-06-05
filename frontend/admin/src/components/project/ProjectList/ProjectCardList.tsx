// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import React, { useContext, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AccessTime, Delete, Memory, Search } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Pagination,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Unstable_Grid2';
import dayjs from 'dayjs';
import { enqueueSnackbar } from 'notistack';

import { type ProjectProps } from '@/types/projects';
import { ConfirmationContext } from '@/contexts/ConfirmationContext';
import { useDeleteProject } from '@/hooks/api-hooks/use-project-api';

function ProjectCard({ project }: { project: ProjectProps }): React.JSX.Element {
  const { openConfirmationDialog } = useContext(ConfirmationContext);
  const router = useRouter();
  const deleteProject = useDeleteProject();

  const onCardClicked = (id: number): void => {
    router.push(`/project/${id}`);
  };

  const handleDelete = (ev: ReactMouseEvent<HTMLButtonElement>, id: number): void => {
    ev.stopPropagation();
    openConfirmationDialog({
      title: 'Delete Project',
      message: 'Are you sure you want to delete?',
      onClick: () => {
        confirmDelete(id);
      },
    });
  };

  const confirmDelete = (id: number): void => {
    deleteProject.mutate(
      { id },
      {
        onSuccess: (response) => {
          if (response.status) {
            enqueueSnackbar(`Project: ${project.name} delete successfully.`, { variant: 'success' });
          } else {
            enqueueSnackbar('Failed to delete project. Please check with admin.', { variant: 'error' });
          }
        },
      }
    );
  };

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <Tooltip title={project.name} placement='bottom' arrow
        slotProps={{
          popper: {
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: [0, -100],
                },
              },
            ],
          },
        }}
      >
        <CardActionArea sx={{ width: "100%", height: "100%" }}
          onClick={() => {
            onCardClicked(project.id);
          }}
        >
          <CardContent sx={{ flex: '1 1 auto', height: "calc(100% - 55px)" }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Avatar variant="square" />
              </Box>
              <Stack spacing={1}>
                <Typography noWrap align="center" variant="h5">
                  {project.name}
                </Typography>
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
            <Stack sx={{ alignItems: 'center' }} direction="row" spacing={1}>
              <AccessTime sx={{ fontSize: 'var(--icon-fontSize-sm)', color: 'white' }} />
              <Typography color="white" display="inline" variant="body2">
                {dayjs(project.created_date).format('MMM D, YYYY')}
              </Typography>
            </Stack>
            <Stack sx={{ alignItems: 'center' }} direction="row" spacing={1}>
              <Memory sx={{ fontSize: 'var(--icon-fontSize-sm)', color: 'white' }} />
              <Typography color="white" display="inline" variant="body2">
                {project.projectType}
              </Typography>
            </Stack>
          </Stack>
        </CardActionArea>
      </Tooltip>

      <Box sx={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <IconButton
          color="error"
          onClick={(ev) => {
            handleDelete(ev, project.id);
          }}
        >
          <Delete sx={{ fontSize: 'var(--icon-fontSize-md)' }} />
        </IconButton>
      </Box>
    </Card>
  );
}

export default function ProjectCardList({ projects }: { projects: ProjectProps[] }): React.JSX.Element {
  const [page, setPage] = useState(1)
  const itemsPerPage = 8

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number): void => {
    setPage(value)
  }

  const filteredProjects = useMemo(() => {
    return projects.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  }, [projects, page, itemsPerPage])

  useEffect(() => {
    if (filteredProjects.length < 1 && page !== 1) {
      setPage(prev => prev - 1)
    }
  }, [filteredProjects, page])

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <OutlinedInput
          defaultValue=""
          fullWidth
          placeholder="Search project"
          startAdornment={
            <InputAdornment position="start">
              <Search sx={{ fontSize: 'var(--icon-fontSize-md)' }} />
            </InputAdornment>
          }
          sx={{ maxWidth: '500px' }}
        />
      </Card>
      <Grid container spacing={3}>
        {filteredProjects && filteredProjects.length > 0
          ? filteredProjects.map((project) => (
            <Grid key={project.id} lg={3} md={6} xs={12}>
              <ProjectCard project={project} />
            </Grid>
          ))
          : <Grid xs={12}>
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Typography>No Projects...</Typography>
            </Box>
          </Grid>}
      </Grid>
      {projects && projects.length > 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination count={Math.trunc(projects.length / (itemsPerPage + 1)) + 1} onChange={handlePageChange} page={page} size="small" />
        </Box>
      ) : null}
    </Stack>
  );
}
