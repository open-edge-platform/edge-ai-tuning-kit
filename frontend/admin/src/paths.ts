// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
export const paths = {
  home: '/project',
  project: [
    {
      key: 'systemMessage',
      title: 'System Message',
      href: 'system-message',
      icon: 'message',
      matcher: { type: 'includes', href: 'system-message' },
    },
    {
      key: 'document',
      title: 'Document',
      href: 'document',
      icon: 'article',
      matcher: { type: 'includes', href: 'document' },
    },
    {
      key: 'dataset',
      title: 'Dataset',
      href: 'dataset',
      icon: 'storage',
      matcher: { type: 'includes', href: 'dataset' },
    },
    {
      key: 'training',
      title: 'Training',
      href: 'training',
      icon: 'build',
      matcher: { type: 'includes', href: 'training' },
    },
    {
      key: 'deployment',
      title: 'Deployment',
      href: 'deployment',
      icon: 'cloudUpload',
      matcher: { type: 'includes', href: 'deployment' },
    },
  ],
  errors: { notFound: '/errors/not-found' },
} as const;
