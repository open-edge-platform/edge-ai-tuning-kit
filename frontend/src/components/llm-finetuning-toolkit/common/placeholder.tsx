// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

/**
 * Loading placeholder with spinner
 */
export function LoadingPlaceholder({
  message = "Loading...",
  height = "h-64",
}: {
  message?: string;
  height?: string;
}) {
  return (
    <div className={`flex items-center justify-center ${height}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Error placeholder with retry button
 */
export function ErrorPlaceholder({
  title = "Unable to load data",
  message = "There was a problem connecting to the server. Please try again later.",
  height = "h-64",
  onRetry,
}: {
  title?: string;
  message?: string;
  height?: string;
  onRetry?: () => void;
}) {
  return (
    <div className={`flex items-center justify-center ${height}`}>
      <div className="text-center max-w-md p-6 border border-destructive/20 rounded-lg bg-destructive/5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 text-destructive mx-auto mb-4"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{message}</p>
        {onRetry && (
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state placeholder with optional call to action
 */
export function EmptyPlaceholder({
  icon: Icon,
  title,
  description,
  height = "h-64",
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  height?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`flex flex-col items-center justify-center ${height} border-2 border-dashed border-muted-foreground/20 rounded-lg`}>
      <div className="text-center max-w-sm">
        <Icon className="h-10 w-10 text-muted-foreground/70 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        {action}
      </div>
    </div>
  );
}