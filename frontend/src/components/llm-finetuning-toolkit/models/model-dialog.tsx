// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { InfoIcon, ExternalLinkIcon } from "lucide-react";
import { Model } from "@/hooks/llm-finetuning-toolkit/use-models";

const modelFormSchema = z.object({
  model_id: z.string().min(1, "HuggingFace ID is required"),
  model_description: z.string().optional(),
  model_revision: z.string().default("main"),
  model_type: z.string().default("Text Generation"),
});

type ModelFormValues = z.infer<typeof modelFormSchema>;

interface ModelDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedModel: Model | null;
  onSave: (values: ModelFormValues) => void;
  existingModels?: Model[]; // Add a prop for existing models
}

export function ModelDialog({
  open,
  setOpen,
  selectedModel,
  onSave,
  existingModels = [],
}: ModelDialogProps) {
  const defaultValues: Partial<ModelFormValues> = {
    model_id: "",
    model_description: "",
    model_revision: "main",
    model_type: "TEXT_GENERATION",
  };

  const [isDuplicate, setIsDuplicate] = useState(false);

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: selectedModel || defaultValues,
  });

  // Check if the model_id already exists in the system
  useEffect(() => {
    const modelId = form.watch("model_id");
    
    if (modelId && existingModels.length > 0) {
      // Check if we're editing an existing model or adding a new one
      if (selectedModel) {
        // If editing, only check for duplicates with other models
        const isDuplicateId = existingModels.some(
          model => model.model_id === modelId && model.model_id !== selectedModel.model_id
        );
        setIsDuplicate(isDuplicateId);
      } else {
        // If adding a new model, check against all existing models
        const isDuplicateId = existingModels.some(model => model.model_id === modelId);
        setIsDuplicate(isDuplicateId);
      }
    } else {
      setIsDuplicate(false);
    }
  }, [form.watch("model_id"), existingModels, selectedModel]);

  // Extract model name from HuggingFace ID
  useEffect(() => {
    const huggingfaceId = form.watch("model_id");
    if (huggingfaceId && !selectedModel) {
      // Extract the model name already handled by backend
    }
  }, [form.watch("model_id"), form, selectedModel]);

  const onSubmit = (data: ModelFormValues) => {
    // Prevent submission if it's a duplicate
    if (isDuplicate) return;
    
    onSave(data);
    // Reset form to default values after saving
    form.reset(defaultValues);
  };

  // Reset form when dialog is closed
  const handleClose = () => {
    form.reset(defaultValues);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="dialog">
        <DialogHeader>
          <DialogTitle>
            {selectedModel ? "Edit Model" : "Add New Model"}
          </DialogTitle>
          <DialogDescription>
            {selectedModel
              ? "Update the model information below."
              : "Add a new model from HuggingFace to your library."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="model_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HuggingFace ID</FormLabel>
                    <div className="mb-2 p-3 bg-muted/50 rounded-md border text-sm text-muted-foreground dark:bg-muted/20">
                      <div className="flex items-start gap-2">
                        <InfoIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            How to get the HuggingFace ID:
                          </p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>
                              Go to{" "}
                              <a
                                href="https://huggingface.co/models"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline inline-flex items-center"
                              >
                                HuggingFace Models{" "}
                                <ExternalLinkIcon className="h-3 w-3 ml-1" />
                              </a>
                            </li>
                            <li>Find and select your desired model</li>
                            <li>
                              Copy the ID from the URL or model page header
                            </li>
                          </ol>
                          <p className="mt-1">
                            Format:{" "}
                            <code className="bg-muted px-1 py-0.5 rounded text-foreground">
                              organization/model-name
                            </code>
                          </p>
                          <p className="mt-1">
                            Example:{" "}
                            <code className="bg-muted px-1 py-0.5 rounded text-foreground">
                              Qwen/Qwen2.5-7B-Instruct
                            </code>
                          </p>
                        </div>
                      </div>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="Qwen/Qwen2.5-7B-Instruct"
                        {...field}
                        className={isDuplicate ? "border-red-500" : ""}
                      />
                    </FormControl>
                    {isDuplicate && (
                      <p className="text-sm font-medium text-red-500 mt-1">
                        This model ID already exists in your library.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model_revision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Revision</FormLabel>
                    <FormControl>
                      <Input placeholder="main" {...field} />
                    </FormControl>
                    <FormDescription>
                      The specific branch or commit hash
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Model description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TEXT_GENERATION">
                          Text Generation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isDuplicate}>Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
