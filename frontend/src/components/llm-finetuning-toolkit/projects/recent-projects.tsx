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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

// Import the projects types and the new date utility function
import { Project } from "@/hooks/llm-finetuning-toolkit/use-projects";
import { formatTimeAgo } from "@/lib/utils";

interface RecentProjectsProps {
  limit?: number;
  projects?: Project[];
  isLoading?: boolean;
  error?: Error | null;
}

export function RecentProjects({
  limit,
  projects,
  isLoading,
  error,
}: RecentProjectsProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>Your recently created projects</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error || !projects) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>Your recently created projects</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-6">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load projects.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort projects by created date (most recent first)
  const sortedProjects = [...projects].sort((a, b) => {
    const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
    const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
    return dateB - dateA;
  });

  const displayProjects = limit
    ? sortedProjects.slice(0, limit)
    : sortedProjects;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your recently created projects</CardDescription>
          </div>
          <Button size="sm" asChild>
            <Link href="/llm-finetuning-toolkit/projects">Manage Projects</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {displayProjects.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            No projects found. Create a project to get started.
          </div>
        ) : (
          displayProjects.map((project) => (
            <Link
              key={project.id}
              href={`/llm-finetuning-toolkit/projects/${project.id}`}
              className="flex items-center justify-between gap-4 group p-2 -mx-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="font-medium hover:text-primary transition-colors">
                  {project.name}
                </div>
                {project.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {project.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Created{" "}
                  {project.created_date
                    ? formatTimeAgo(new Date(project.created_date))
                    : "unknown"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {project.tasks && (
                    <Badge variant="outline" className="bg-primary/10">
                      {project.tasks.length}{" "}
                      {project.tasks.length === 1 ? "Task" : "Tasks"}
                    </Badge>
                  )}
                  {project.modified_date &&
                    project.created_date !== project.modified_date && (
                      <Badge variant="secondary">
                        Updated {formatTimeAgo(new Date(project.modified_date))}
                      </Badge>
                    )}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4" />
                <span className="sr-only">View Project</span>
              </div>
            </Link>
          ))
        )}

        {limit && projects.length > limit && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/llm-finetuning-toolkit/projects">
                View All Projects
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
