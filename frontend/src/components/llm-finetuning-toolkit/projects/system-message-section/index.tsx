// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HelpCircle, ChevronDown, Eye, Edit } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useDataset,
  useUpdateDataset,
} from "@/hooks/llm-finetuning-toolkit/use-datasets";
import { Templates, MessageTemplate } from "./templates";
import { MarkdownRenderer } from "../../common/markdown";

export function SystemMessageSection({ projectId }: { projectId: string }) {
  const [systemMessage, setSystemMessage] = useState("");
  const [originalMessage, setOriginalMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Get dataset data using the hook
  const { data: dataset, isLoading: isDatasetLoading } = useDataset(
    parseInt(projectId, 10)
  );
  const updateDataset = useUpdateDataset();

  // Load system message from the dataset
  useEffect(() => {
    if (dataset) {
      const template = dataset.prompt_template || "";
      setSystemMessage(template);
      setOriginalMessage(template);
      setHasChanges(false);
    }
  }, [dataset]);

  // Check for changes when system message is updated
  useEffect(() => {
    setHasChanges(systemMessage !== originalMessage);
  }, [systemMessage, originalMessage]);

  const handleSave = async () => {
    if (systemMessage.trim() === "") {
      toast.error("System message cannot be empty.");
      return;
    }

    try {
      // Update the dataset with the new prompt_template
      await updateDataset.mutateAsync({
        id: parseInt(projectId, 10),
        data: {
          prompt_template: systemMessage,
        },
      });
      toast.success("Your system message has been saved successfully.");
      // Update original message to match current message after successful save
      setOriginalMessage(systemMessage);
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save the system message. Please try again.");
      console.error("Error saving system message:", error);
    }
  };

  // Apply the selected template to the system message
  const applyTemplate = (template: MessageTemplate) => {
    setSystemMessage(template.content);
    toast.success(`Applied "${template.name}" template.`);
  };

  return (
    <TooltipProvider>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="dark:text-gray-100">System Message</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Configure how the model should behave
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm p-3 bg-white dark:bg-slate-800 shadow-md rounded-lg border-none">
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                The system message provides context and instructions to the
                model about how it should behave. It helps set the tone, style,
                and capabilities of the assistant you are fine-tuning.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium dark:text-gray-100">
                  Configure System Message
                </h4>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 bg-white dark:bg-gray-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
                        disabled={isDatasetLoading || updateDataset.isPending}
                      >
                        <span className="text-sm">Use Template</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[240px]">
                      {Templates.map((template) => (
                        <DropdownMenuItem
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="cursor-pointer flex flex-col items-start gap-1 py-2"
                        >
                          <span className="font-medium text-sm">
                            {template.name}
                          </span>
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {template.description}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <Tabs defaultValue="edit" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="edit" className="flex items-center gap-1">
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="edit" className="mt-0">
                  <Textarea
                    placeholder="Enter your system message here..."
                    className="min-h-[200px] font-mono text-sm resize-y rounded-md border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700"
                    value={systemMessage}
                    onChange={(e) => setSystemMessage(e.target.value)}
                    disabled={isDatasetLoading || updateDataset.isPending}
                    rows={8}
                    wrap="soft"
                  />
                  <p className="text-xs text-muted-foreground mt-2 dark:text-gray-400">
                    Press Enter for new lines. The message will be used exactly as
                    entered.
                  </p>
                </TabsContent>
                
                <TabsContent value="preview" className="mt-0">
                  <div className="min-h-[200px] border border-slate-200 rounded-md p-4 overflow-auto dark:border-slate-700">
                    <MarkdownRenderer content={systemMessage} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 dark:text-gray-400">
                    This is how your system message will appear when rendered as markdown.
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      onClick={handleSave}
                      disabled={
                        isDatasetLoading ||
                        updateDataset.isPending ||
                        systemMessage.trim() === "" ||
                        !hasChanges
                      }
                      className={`bg-primary hover:bg-primary/90 text-white transition-colors ${
                        updateDataset.isPending ? "opacity-70" : ""
                      }`}
                    >
                      {updateDataset.isPending
                        ? "Saving..."
                        : "Save System Message"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!hasChanges && systemMessage.trim() !== "" && (
                  <TooltipContent
                    side="top"
                    className="p-2 bg-white dark:bg-slate-800 shadow-md rounded-lg border-none"
                  >
                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      No changes to save
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
