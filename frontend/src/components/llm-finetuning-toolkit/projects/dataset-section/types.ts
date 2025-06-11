// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

export interface MessagePair {
  id: string
  createdAt: Date
  raw_data?: { messages: ChatMessage[]; }
  isGenerated?: boolean 
  dataset_id?: number
  // OpenAI chat format fields
  messages?: ChatMessage[]
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DatasetEntry {
  id: string
  userMessage: string
  assistantMessage: string
  source: string
  quality: "high" | "medium" | "low"
  createdAt: Date
  selected: boolean
}

