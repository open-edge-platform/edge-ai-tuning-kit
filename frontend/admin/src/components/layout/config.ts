// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

export const navItems = [...paths.project] satisfies NavItemConfig[];
