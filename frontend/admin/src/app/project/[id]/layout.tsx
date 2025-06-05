// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import * as React from 'react';
import { getProjectAPI, getProjectsAPI } from '@/api/projects';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import GlobalStyles from '@mui/material/GlobalStyles';

import { type ProjectProps } from '@/types/projects';
import { ProjectNav } from '@/components/layout/project-nav';
import { SideNav } from '@/components/layout/side-nav';

interface LayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function Layout({ params, children }: LayoutProps): Promise<React.JSX.Element> {
  const { data: project }: { data?: ProjectProps } = await getProjectAPI(parseInt(params.id));
  const { data: projects }: { data?: ProjectProps[] } = await getProjectsAPI();

  return (
    <>
      <GlobalStyles
        styles={{
          body: {
            '--MainNav-height': '56px',
            '--MainNav-zIndex': 1000,
            '--SideNav-width': '280px',
            '--SideNav-zIndex': 1100,
            '--MobileNav-width': '320px',
            '--MobileNav-zIndex': 1100,
          },
        }}
      />
      <Box
        sx={{
          bgcolor: 'var(--mui-palette-background-default)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: '100%',
        }}
      >
        <SideNav projects={projects} project={project} />
        <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', pl: { lg: 'var(--SideNav-width)' } }}>
          <ProjectNav project={project} projects={projects} />
          <main>
            <Container maxWidth="xl" sx={{ py: '32px' }}>
              {children}
            </Container>
          </main>
        </Box>
      </Box>
    </>
  );
}
