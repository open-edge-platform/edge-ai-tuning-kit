// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { Brain, LucideIcon } from "lucide-react";

export interface Tool {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon; // Using LucideIcon type for proper typing
  category: string;
  experimental: boolean;
  disabled: boolean;
  tags: string[];
  route: string; // Add route property to store the navigation path
}

export const toolList: Tool[] = [
  {
    id: "llm-finetuning-toolkit",
    title: "LLM Fine-tuning Toolkit",
    description: "Complete toolkit for fine-tuning LLMs with custom datasets",
    icon: Brain,
    category: "Toolkits",
    experimental: false,
    disabled: false,
    tags: ["LLM", "Fine-tuning"],
    route: "/llm-finetuning-toolkit/dashboard",
  }
];
