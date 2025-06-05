// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse | undefined {
  const { pathname, origin } = request.nextUrl;
  if (pathname.includes('project')) {
    return NextResponse.redirect(new URL(`${pathname}/system-message`, origin));
  }
  return NextResponse.redirect(new URL('/project', origin));
}

export const config = {
  matcher: ['/project/:id/', '/'],
};
