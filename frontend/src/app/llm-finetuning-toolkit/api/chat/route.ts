// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { createOpenAI } from "@ai-sdk/openai";
import { type CoreMessage, streamText } from "ai";
import { type NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- disable for route handler
export async function POST(req: NextRequest) {
  try {
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

    if (!modelID) {
      // Use the AI SDK's expected error format
      return Response.json(
        { error: { message: "Model ID is required" } },
        { status: 400 }
      );
    }

    const hostname = process.env.NEXT_PUBLIC_HOSTNAME || "localhost";
    const openai = createOpenAI({
      baseURL: `http://${hostname}:5999/v1/`,
      apiKey: "-",
      compatibility: "compatible",
    });

    try {
      const result = await streamText({
        model: openai(modelID),
        messages: messages,
        maxTokens: maxTokens,
        temperature: temperature,
      });
      return result.toDataStreamResponse();
    } catch (streamError) {
      console.error("Error in streamText:", streamError);
      // Format error response to match what the useChat hook expects
      return Response.json(
        {
          error: {
            message:
              streamError instanceof Error
                ? streamError.message
                : "Failed to generate response",
            type: "stream_error",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in chat route handler:", error);
    // Format error response to match what the useChat hook expects
    return Response.json(
      {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to process request",
          type: "request_error",
        },
      },
      { status: 500 }
    );
  }
}
