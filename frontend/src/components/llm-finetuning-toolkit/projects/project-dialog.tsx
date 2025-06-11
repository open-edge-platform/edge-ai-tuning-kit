// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Project,
  useCreateProject,
  useUpdateProject,
} from "@/hooks/llm-finetuning-toolkit/use-projects";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Schema for project validation
const projectSchema = z.object({
  name: z.string().min(3, {
    message: "Project name must be at least 3 characters.",
  }),
  description: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedProject?: Project | null;
  onSave?: (data: ProjectFormValues) => void;
}

// Default values - moved outside component to prevent recreation on each render
const defaultValues: Partial<ProjectFormValues> = {
  name: "",
  description: "",
};

export function ProjectDialog({
  open,
  setOpen,
  selectedProject,
  onSave,
}: ProjectDialogProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isEditing = !!selectedProject;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  });

  // Reset form when modal is opened with new project data
  useEffect(() => {
    if (open) {
      if (isEditing && selectedProject) {
        form.reset({
          name: selectedProject.name,
          description: selectedProject.description || "",
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, isEditing, selectedProject, form]);

  function onSubmit(data: ProjectFormValues) {
    if (onSave) {
      onSave(data);
      return;
    }

    if (isEditing && selectedProject) {
      updateProject.mutate(
        {
          id: selectedProject.id,
          data: {
            name: data.name,
            description: data.description,
          },
        },
        {
          onSuccess: () => {
            setOpen(false);
            form.reset(defaultValues);
          },
        }
      );
    } else {
      createProject.mutate(data, {
        onSuccess: () => {
          setOpen(false);
          form.reset(defaultValues);
        },
      });
    }
  }

  const handleCancel = () => {
    setOpen(false);
    form.reset(defaultValues);
  };

  // Create a custom handler for the Dialog's onOpenChange to prevent infinite loops
  const handleOpenChange = (newOpen: boolean) => {
    // Only call setOpen if we're actually changing the state
    if (newOpen !== open) {
      setOpen(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your project details below."
              : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Project" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a project description"
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help identify the purpose of this
                    project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProject.isPending || updateProject.isPending}
              >
                {isEditing ? "Save Changes" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Export the original interface for backward compatibility
export interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

// Export the original component for backward compatibility
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: ProjectFormDialogProps) {
  // Create a wrapper function to prevent infinite loops
  const handleSetOpen = (newOpen: boolean) => {
    if (newOpen !== open) {
      onOpenChange(newOpen);
    }
  };

  return (
    <ProjectDialog
      open={open}
      setOpen={handleSetOpen}
      selectedProject={project}
    />
  );
}
