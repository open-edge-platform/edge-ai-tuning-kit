// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { createOpenAI } from '@ai-sdk/openai';
import { type CoreMessage, streamText } from 'ai';
import { type NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- disable for route handler
export async function POST(req: NextRequest) {
    const { messages, modelID, max_tokens: maxTokens, temperature }: { messages: CoreMessage[], modelID: string, max_tokens: number, temperature: number } = await req.json();
    const openai = createOpenAI({
        baseURL: `http://${process.env.NEXT_PUBLIC_API_URL}:5999/v1/`,
        apiKey: "-",
        compatibility: "compatible"
    })
    const result = streamText({
        model: openai(modelID),
        system: 'You are a helpful assistant.',
        messages,
        maxTokens,
        temperature
    });

    return result.toDataStreamResponse();
}