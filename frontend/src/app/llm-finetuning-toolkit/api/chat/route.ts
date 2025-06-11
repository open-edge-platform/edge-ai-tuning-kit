// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { createOpenAI } from "@ai-sdk/openai";
import { type CoreMessage, streamText } from "ai";
import { type NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- disable for route handler
export async function POST(req: NextRequest) {
  const {
    messages,
    modelID,
    maxTokens,
    temperature,
  }: {
    messages: CoreMessage[];
    modelID: string;
    maxTokens: number;
    temperature: number;
  } = await req.json();
  const hostname = process.env.NEXT_PUBLIC_HOSTNAME || "localhost";
  const openai = createOpenAI({
    baseURL: `http://${hostname}:5999/v1/`,
    apiKey: "-",
    compatibility: "compatible",
  });
  const result = await streamText({
    model: openai(modelID),
    messages: messages,
    maxTokens: maxTokens,
    temperature: temperature,
  });

  return result.toDataStreamResponse();
}
