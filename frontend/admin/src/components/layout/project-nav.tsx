// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import * as React from 'react';
import { Menu } from '@mui/icons-material';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';

import { type ProjectProps } from '@/types/projects';

import { SideNav } from './side-nav';

export function ProjectNav({
  projects,
  project,
}: {
  projects?: ProjectProps[];
  project?: ProjectProps;
}): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);

  return (
    <React.Fragment>
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid var(--mui-palette-divider)',
          backgroundColor: 'var(--mui-palette-background-paper)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--mui-zIndex-appBar)',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', px: 2 }}
        >
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            <IconButton
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{ display: { lg: 'none' } }}
            >
              <Menu />
            </IconButton>
          </Stack>
        </Stack>
      </Box>
      <SideNav
        mobile
        projects={projects}
        project={project}
        mobileOnClose={() => {
          setOpenNav(false);
        }}
        mobileOpen={openNav}
      />
    </React.Fragment>
  );
}
