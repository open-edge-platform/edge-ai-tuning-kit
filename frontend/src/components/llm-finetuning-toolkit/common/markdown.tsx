// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import ReactMarkdown from "react-markdown";
import "@/styles/markdown.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * A reusable component for rendering markdown content
 * @param content - The markdown content to render
 * @param className - Additional CSS classes to apply to the container
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}