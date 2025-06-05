// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { config } from '@/config';
import { createLogger } from '@/lib/logger';

export const logger = createLogger({ level: config.logLevel });
