// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

// Framework import
import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppBar, Box, Container, MenuItem, Toolbar, Typography } from '@mui/material';

import { paths } from '@/paths';

import { Logo } from '../core/logo';

export function MainNav(): React.JSX.Element {
  const pages = [
    { name: 'Projects', href: '/project' },
    { name: 'Models', href: '/models' },
    // { name: 'Settings', href: '/settings' },
  ];

  const router = useRouter();
  const handleNavigate = (href: string): void => {
    router.push(href);
  };

  const pathname = usePathname();
  const checkIsActive = (href: string): boolean => {
    if (pathname.includes(href)) {
      return true;
    }

    return false;
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: 'var(--mui-palette-background-paper)' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-flex', pr: 2 }}>
            <Logo color="light" height={48} width={48} />
          </Box>
          {pages.map((page) => (
            <MenuItem
              key={page.name}
              sx={(theme) => ({
                mr: 1,
                borderRadius: '8px',
                backgroundColor: checkIsActive(page.href) ? theme.palette.primary.main : 'none',
              })}
              onClick={() => {
                handleNavigate(page.href);
              }}
            >
              <Box sx={{ display: 'inline-flex' }}>
                <Typography
                  variant="body1"
                  fontWeight={500}
                  color={checkIsActive(page.href) ? 'white' : 'black'}
                  sx={theme => ({ '&:hover': { color: theme.palette.primary.main } })}
                  textAlign="center"
                >
                  {page.name}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
