// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, AlertCircle, StopCircle } from "lucide-react";

// Import the models types and hooks for download actions
import {
  useDownloadModel,
  useStopDownloadModel,
  type Model,
} from "@/hooks/llm-finetuning-toolkit/use-models";

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Less than a minute
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  // Less than an hour
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  // Less than a day
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  // Less than a month
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  // Less than a year
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  }

  // More than a year
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
};

interface RecentModelsProps {
  limit?: number;
  models?: Model[];
  isLoading?: boolean;
  error?: Error | null;
}

export function RecentModels({
  limit,
  models,
  isLoading,
  error,
}: RecentModelsProps) {
  const downloadModelMutation = useDownloadModel();
  const stopDownloadMutation = useStopDownloadModel();

  // Handle downloading a model
  const handleDownload = (id: number) => {
    downloadModelMutation.mutate(id);
  };

  // Handle stopping a download
  const handleStopDownload = (id: number) => {
    stopDownloadMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Models</CardTitle>
          <CardDescription>
            Recently added models from HuggingFace
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error || !models) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Models</CardTitle>
          <CardDescription>
            Recently added models from HuggingFace
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-6">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load models.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort models by created date (most recent first)
  const sortedModels = [...models].sort((a, b) => {
    return (
      new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );
  });

  // Filter models to show only downloaded ones
  const downloadedModels = sortedModels.filter((model) => model.is_downloaded);

  const displayModels = limit
    ? downloadedModels.slice(0, limit)
    : downloadedModels;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Downloaded Models</CardTitle>
            <CardDescription>
              Models that have been downloaded to your system
            </CardDescription>
          </div>
          <Button size="sm" asChild>
            <Link href="/llm-finetuning-toolkit/models">Manage Models</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {displayModels.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            No downloaded models found. Download a model to get started.
          </div>
        ) : (
          displayModels.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="font-medium">{model.model_id}</div>
                <div className="text-xs text-muted-foreground">
                  Added {formatTimeAgo(new Date(model.created_date))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-primary text-white" variant="outline">
                    {model.model_metadata.model_type}
                  </Badge>
                  {model.is_downloaded ? (
                    <Badge variant="secondary">Downloaded</Badge>
                  ) : (
                    <Badge
                      variant={
                        model.download_metadata.status === "DOWNLOADING"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {model.download_metadata.status}
                    </Badge>
                  )}
                </div>
              </div>
              {!model.is_downloaded && (
                <>
                  {model.download_metadata.status === "DOWNLOADING" ? (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {Math.round(model.download_metadata.progress)}%
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={stopDownloadMutation.isPending}
                        onClick={() => handleStopDownload(model.id)}
                      >
                        {stopDownloadMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <StopCircle className="h-4 w-4" />
                        )}
                        <span className="sr-only">Stop Download</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDownload(model.id)}
                      disabled={downloadModelMutation.isPending}
                    >
                      {downloadModelMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span className="sr-only">Download</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          ))
        )}

        {limit && models.length > limit && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/llm-finetuning-toolkit/models">View All Models</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
