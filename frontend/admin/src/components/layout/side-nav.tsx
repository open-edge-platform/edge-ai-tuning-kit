// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { UnfoldMore } from '@mui/icons-material';
import { Drawer, List, ListItem, ListItemButton, ListItemText, Popover, Tooltip } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { type NavItemConfig } from '@/types/nav';
import { type ProjectProps } from '@/types/projects';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { usePopover, type PopoverController } from '@/hooks/use-popover';
import { Logo } from '@/components/core/logo';

import { navItems } from './config';
import Icon from './nav-icons';

export function SideNav({
  projects = [],
  project,
  mobile,
  mobileOpen,
  mobileOnClose,
}: {
  projects?: ProjectProps[];
  project?: ProjectProps;
  mobile?: boolean;
  mobileOpen?: boolean;
  mobileOnClose?: VoidFunction;
}): React.JSX.Element {
  const pathname = usePathname();
  const projectListPopover = usePopover<HTMLButtonElement>();

  const router = useRouter();
  const handleNavigate = (id: number): void => {
    router.push(`/project/${id}`);
  };

  return (
    <>
      {mobile ? (
        <MobileNav open={mobileOpen!} onClose={mobileOnClose!}>
          <NavBody project={project} projectListPopover={projectListPopover} />
          <Divider sx={{ borderColor: 'var(--mui-palette-neutral-700)' }} />
          <NavList pathname={pathname} />
          <Divider sx={{ borderColor: 'var(--mui-palette-neutral-700)' }} />
        </MobileNav>
      ) : (
        <StandardNav>
          <NavBody project={project} projectListPopover={projectListPopover} />
          <Divider sx={{ borderColor: 'var(--mui-palette-neutral-700)' }} />
          <NavList pathname={pathname} />
          <Divider sx={{ borderColor: 'var(--mui-palette-neutral-700)' }} />
        </StandardNav>
      )}

      <Popover
        id="project-list-popover"
        open={projectListPopover.open}
        anchorEl={projectListPopover.anchorRef.current}
        onClose={() => {
          projectListPopover.handleClose();
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <List sx={{ width: projectListPopover.anchorRef.current?.offsetWidth ?? '200px', maxHeight: "300px" }}>
          {projects && projects.length > 0
            ? projects
              .map((p) => {
                return (
                  <ListItem disablePadding key={`project-list-item-${p.id}`}>
                    <Tooltip placement='right' arrow title={p.name}>
                      <ListItemButton
                        onClick={() => {
                          handleNavigate(p.id);
                        }}
                        selected={p.id === project?.id}
                      >
                        <ListItemText
                          primary={p.name}
                          primaryTypographyProps={{
                            fontWeight: 'medium',
                            variant: 'body2',
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        />
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                );
              })
            : null}
        </List>
      </Popover>
    </>
  );
}

function MobileNav({
  children,
  open,
  onClose,
}: {
  children: React.ReactNode;
  open: boolean;
  onClose: VoidFunction;
}): React.JSX.Element {
  return (
    <Drawer
      PaperProps={{
        sx: {
          '--MobileNav-background': 'var(--mui-palette-neutral-950)',
          '--MobileNav-color': 'var(--mui-palette-common-white)',
          '--NavItem-color': 'var(--mui-palette-neutral-300)',
          '--NavItem-hover-background': 'rgba(255, 255, 255, 0.04)',
          '--NavItem-active-background': 'var(--mui-palette-primary-main)',
          '--NavItem-active-color': 'var(--mui-palette-primary-contrastText)',
          '--NavItem-disabled-color': 'var(--mui-palette-neutral-500)',
          '--NavItem-icon-color': 'var(--mui-palette-neutral-400)',
          '--NavItem-icon-active-color': 'var(--mui-palette-primary-contrastText)',
          '--NavItem-icon-disabled-color': 'var(--mui-palette-neutral-600)',
          bgcolor: 'var(--MobileNav-background)',
          color: 'var(--MobileNav-color)',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '100%',
          scrollbarWidth: 'none',
          width: 'var(--MobileNav-width)',
          zIndex: 'var(--MobileNav-zIndex)',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      }}
      onClose={onClose}
      open={open}
    >
      {children}
    </Drawer>
  );
}

function StandardNav({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Box
      sx={{
        '--SideNav-background': 'var(--mui-palette-neutral-950)',
        '--SideNav-color': 'var(--mui-palette-common-white)',
        '--NavItem-color': 'var(--mui-palette-neutral-300)',
        '--NavItem-hover-background': 'rgba(255, 255, 255, 0.04)',
        '--NavItem-active-background': 'var(--mui-palette-primary-main)',
        '--NavItem-active-color': 'var(--mui-palette-primary-contrastText)',
        '--NavItem-disabled-color': 'var(--mui-palette-neutral-500)',
        '--NavItem-icon-color': 'var(--mui-palette-neutral-400)',
        '--NavItem-icon-active-color': 'var(--mui-palette-primary-contrastText)',
        '--NavItem-icon-disabled-color': 'var(--mui-palette-neutral-600)',
        bgcolor: 'var(--SideNav-background)',
        color: 'var(--SideNav-color)',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        height: '100%',
        left: 0,
        maxWidth: '100%',
        position: 'fixed',
        scrollbarWidth: 'none',
        top: 0,
        width: 'var(--SideNav-width)',
        zIndex: 'var(--SideNav-zIndex)',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {children}
    </Box>
  );
}

function NavBody({
  projectListPopover,
  project,
}: {
  project?: ProjectProps;
  projectListPopover: PopoverController<HTMLButtonElement>;
}): React.JSX.Element {
  return (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-flex' }}>
          <Logo color="light" height={32} width={32} />
        </Box>
        <Typography fontSize="0.75rem" align="center" sx={{ fontWeight: 600 }}>
          Edge AI Tuning Kit
        </Typography>
      </Stack>
      <Tooltip title="Change Project">
        <Button
          sx={{
            alignItems: 'center',
            backgroundColor: 'var(--mui-palette-neutral-950)',
            border: '1px solid var(--mui-palette-neutral-700)',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            p: '4px 12px',
            color: 'white',
            textAlign: 'left',
          }}
          ref={projectListPopover.anchorRef}
          onClick={() => {
            projectListPopover.handleOpen();
          }}
        >
          <Box sx={{ flex: '1 1 auto' }}>
            <Typography color="var(--mui-palette-neutral-400)" variant="body2">
              Project
            </Typography>
            <Typography color="inherit" variant="subtitle1" noWrap sx={{ width: "150px" }}>
              {project ? project.name : ''}
            </Typography>
          </Box>
          <UnfoldMore />
        </Button>
      </Tooltip>
    </Stack>
  );
}

function NavList({ pathname }: { pathname: string }): React.JSX.Element {
  return (
    <Box component="nav" sx={{ flex: '1 1 auto', p: '12px' }}>
      {renderNavItems({ pathname, items: navItems })}
    </Box>
  );
}

function renderNavItems({ items = [], pathname }: { items?: NavItemConfig[]; pathname: string }): React.JSX.Element {
  const children = items.reduce((acc: React.ReactNode[], curr: NavItemConfig): React.ReactNode[] => {
    const { key, ...item } = curr;
    acc.push(<NavItem key={key} pathname={pathname} {...item} />);

    return acc;
  }, []);

  return (
    <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {children}
    </Stack>
  );
}

interface NavItemProps extends Omit<NavItemConfig, 'items'> {
  pathname: string;
}

function NavItem({ disabled, external, href, icon, matcher, pathname, title }: NavItemProps): React.JSX.Element {
  const active = isNavItemActive({ disabled, external, href, matcher, pathname });
  const params = useParams<{ id: string }>();
  return (
    <li>
      <Box
        {...(href
          ? {
            component: external ? 'a' : RouterLink,
            href: params.id ? `/project/${params.id}/${href}` : '/projects',
            target: external ? '_blank' : undefined,
            rel: external ? 'noreferrer' : undefined,
          }
          : { role: 'button' })}
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          color: 'var(--NavItem-color)',
          cursor: 'pointer',
          display: 'flex',
          flex: '0 0 auto',
          gap: 1,
          p: '6px 16px',
          position: 'relative',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          ...(disabled && {
            bgcolor: 'var(--NavItem-disabled-background)',
            color: 'var(--NavItem-disabled-color)',
            cursor: 'not-allowed',
          }),
          ...(active && { bgcolor: 'var(--NavItem-active-background)', color: 'var(--NavItem-active-color)' }),
        }}
      >
        <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
          {/* {Icon ? (
            <Icon
              fill={active ? 'var(--NavItem-icon-active-color)' : 'var(--NavItem-icon-color)'}
              fontSize="var(--icon-fontSize-md)"
              weight={active ? 'fill' : undefined}
            />
          ) : null} */}
          {icon ? <Icon iconName={icon} active={active} /> : null}
        </Box>
        <Box sx={{ flex: '1 1 auto' }}>
          <Typography
            component="span"
            sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: 500, lineHeight: '28px' }}
          >
            {title}
          </Typography>
        </Box>
      </Box>
    </li>
  );
}
