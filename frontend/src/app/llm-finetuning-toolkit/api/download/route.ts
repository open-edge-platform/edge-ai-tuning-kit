// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { type NextRequest } from "next/server";

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");
  const hostname = process.env.NEXT_PUBLIC_HOSTNAME || "localhost";
  const url = `http://${hostname}:5999/v1/services/download_deployment_file?id=${id}`;
  const request = new Request(url, req);
  const response = await fetch(request);
  return response;
}
