// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronRight, Info, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CreateTaskProps } from "./types";

function FormTooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="max-w-xs p-2 text-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FormField({
  id,
  label,
  error,
  tooltip,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {tooltip && (
          <FormTooltip content={tooltip}>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </FormTooltip>
        )}
      </div>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

// Define options for dropdown menus for easier maintenance
const FINETUNING_METHODS = [
  { value: "QLORA", label: "QLoRA" },
  { value: "LORA", label: "LoRA" },
];

const GPU_ALLOCATION_OPTIONS = [
  { value: "-1", label: "Use all available GPUs" },
  { value: "1", label: "Use single GPU" },
];

const OPTIMIZER_OPTIONS = [
  { value: "adamw_torch_fused", label: "AdamW Fused (PyTorch)" },
  { value: "adamw_torch", label: "AdamW (PyTorch)" },
];

const LR_SCHEDULER_OPTIONS = [
  { value: "cosine", label: "Cosine" },
  { value: "linear", label: "Linear" },
  { value: "constant", label: "Constant" },
];

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateTaskProps;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onCheckboxChange: (name: string, checked: boolean) => void;
  onCreateTask: () => void;
  supportedDevice: Array<{ name: string; label: string }>;
  models: Array<{ model_id: string; model_name?: string }>;
  disabled?: boolean;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  formData,
  onInputChange,
  onSelectChange,
  onCheckboxChange,
  onCreateTask,
  supportedDevice,
  models = [],
  disabled = false,
}: CreateTaskDialogProps) {
  const [activeStep, setActiveStep] = useState<string>("basics");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasModels = models && models.length > 0;

  // Reset to first page whenever the dialog is opened
  useEffect(() => {
    if (open) {
      setActiveStep("basics");
    }
  }, [open]);

  // Force num_gpus to "1" when QLoRA is selected
  useEffect(() => {
    if (formData.task_type === "QLORA" && formData.num_gpus !== "1") {
      onSelectChange("num_gpus", "1");
    }
  }, [formData.task_type, formData.num_gpus, onSelectChange]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.model_path) {
      newErrors.model_path = "Model selection is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTask = () => {
    if (validateForm()) {
      onCreateTask();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white"
          disabled={!hasModels || disabled}
          title={
            !hasModels
              ? "No models available for training"
              : disabled
              ? "Not enough data samples (minimum 5 required)"
              : "Create new training task"
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Create Training Task
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Create Training Task
          </DialogTitle>
          <DialogDescription>
            Configure the parameters for your model training task. Required
            fields are marked with an asterisk (*).
          </DialogDescription>
          <Separator className="my-2" />
        </DialogHeader>

        <Tabs
          value={activeStep}
          onValueChange={setActiveStep}
          className="w-full flex flex-col flex-grow"
        >
          <TabsList className="px-6 grid grid-cols-2 mb-0 flex-shrink-0">
            <TabsTrigger
              value="basics"
              className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary-900 rounded-md"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-xs",
                    activeStep === "basics"
                      ? "bg-primary text-white"
                      : "bg-gray-200"
                  )}
                >
                  1
                </div>
                <span>Basic Setup</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="training"
              className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary-900 rounded-md"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-xs",
                    activeStep === "training"
                      ? "bg-primary text-white"
                      : "bg-gray-200"
                  )}
                >
                  2
                </div>
                <span>Training</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <div className="px-6 py-4 overflow-y-auto max-h-[60vh] flex-grow">
            {/* --------------------- BASICS TAB --------------------- */}
            <TabsContent value="basics" className="mt-0 space-y-4">
              <FormField
                id="model"
                label="Base Model *"
                error={errors.model_path}
                tooltip="The foundation model you want to fine-tune."
              >
                <Select
                  value={formData.model_path}
                  onValueChange={(value) => onSelectChange("model_path", value)}
                >
                  <SelectTrigger
                    id="model"
                    className={cn(
                      errors.model_path &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  >
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.model_id} value={model.model_id}>
                        <div className="flex items-center gap-2">
                          <span>{model.model_name || model.model_id}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="task-type"
                label="Fine-tuning Method"
                tooltip="The method used for fine-tuning. LoRA is recommended for most cases as it's memory-efficient."
              >
                <Select
                  value={formData.task_type}
                  onValueChange={(value) => onSelectChange("task_type", value)}
                >
                  <SelectTrigger id="task-type">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {FINETUNING_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <span>{method.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="device"
                label="Hardware Device"
                tooltip="The hardware device to use for training."
              >
                <Select
                  value={formData.device}
                  onValueChange={(value) => onSelectChange("device", value)}
                >
                  <SelectTrigger id="device">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedDevice.map((device) => (
                      <SelectItem key={device.name} value={device.name}>
                        <div className="flex items-center gap-2">
                          <span>{device.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="gpus"
                label="GPU Allocation"
                tooltip={
                  formData.task_type === "QLORA"
                    ? "QLoRA currently only supports single GPU mode"
                    : "Number of GPUs to use for training. Use '-1' to utilize all available GPUs."
                }
              >
                <Select
                  value={formData.num_gpus}
                  onValueChange={(value) => onSelectChange("num_gpus", value)}
                  disabled={formData.task_type === "QLORA"}
                >
                  <SelectTrigger id="gpus">
                    <SelectValue placeholder="Select GPU count" />
                  </SelectTrigger>
                  <SelectContent>
                    {GPU_ALLOCATION_OPTIONS.filter(
                      (option) =>
                        formData.task_type !== "QLORA" || option.value === "1"
                    ).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </TabsContent>

            {/* ------------------- TRAINING TAB -------------------- */}
            <TabsContent value="training" className="mt-0 space-y-4">
              <FormField
                id="training-batch-size"
                label="Training Batch Size"
                tooltip="Number of samples processed before the model is updated. Larger values may require more memory."
              >
                <Input
                  id="training-batch-size"
                  name="per_device_train_batch_size"
                  type="number"
                  min="1"
                  max="64"
                  value={formData.per_device_train_batch_size}
                  onChange={onInputChange}
                  className="w-full"
                />
              </FormField>

              <FormField
                id="eval-batch-size"
                label="Evaluation Batch Size"
                tooltip="Batch size used during evaluation. Can typically be larger than training batch size."
              >
                <Input
                  id="eval-batch-size"
                  name="per_device_eval_batch_size"
                  type="number"
                  min="1"
                  max="64"
                  value={formData.per_device_eval_batch_size}
                  onChange={onInputChange}
                  className="w-full"
                />
              </FormField>

              <FormField
                id="epochs"
                label="Training Epochs"
                tooltip="Number of complete passes through the training dataset. This will be converted to training steps internally (epochs × dataset_size/batch_size)."
              >
                <Input
                  id="epochs"
                  name="num_train_epochs"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.num_train_epochs}
                  onChange={onInputChange}
                  className="w-full"
                />
              </FormField>

              <FormField
                id="maximum-token-length"
                label="Maximum Token Length"
                tooltip="Set a maximum token length to prevent GPU out-of-memory (OOM) errors during fine-tuning. Long contexts with large models can quickly exceed memory limits."
              >
                <Input
                  id="maximum-token-length"
                  name="max_length"
                  type="number"
                  min="1"
                  max="2048"
                  value={formData.max_length}
                  onChange={onInputChange}
                  className="w-full"
                />
              </FormField>

              <FormField
                id="learning-rate"
                label="Learning Rate"
                tooltip="Controls how much to change the model in response to the estimated error. Smaller values are typically better for fine-tuning."
              >
                <Input
                  id="learning-rate"
                  name="learning_rate"
                  type="number"
                  step="0.00001"
                  min="0.00001"
                  max="0.01"
                  value={formData.learning_rate}
                  onChange={onInputChange}
                  className="w-full"
                />
              </FormField>

              <FormField
                id="optimizer"
                label="Optimizer"
                tooltip="Algorithm used to update the model weights based on the loss gradient."
              >
                <Select
                  value={formData.optim}
                  onValueChange={(value) => onSelectChange("optim", value)}
                >
                  <SelectTrigger id="optimizer">
                    <SelectValue placeholder="Select optimizer" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTIMIZER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="lr-scheduler"
                label="LR Scheduler"
                tooltip="Controls the learning rate changes during training. Cosine scheduler gradually reduces the learning rate."
              >
                <Select
                  value={formData.lr_scheduler_type}
                  onValueChange={(value) =>
                    onSelectChange("lr_scheduler_type", value)
                  }
                >
                  <SelectTrigger id="lr-scheduler">
                    <SelectValue placeholder="Select scheduler" />
                  </SelectTrigger>
                  <SelectContent>
                    {LR_SCHEDULER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="grad-accum-steps"
                label="Gradient Accumulation Steps"
                tooltip="Simulates larger batch sizes by accumulating gradients over multiple steps. Useful for memory-constrained environments."
              >
                <Input
                  id="grad-accum-steps"
                  name="gradient_accumulation_steps"
                  type="number"
                  min="1"
                  max="32"
                  value={formData.gradient_accumulation_steps}
                  onChange={onInputChange}
                  className="w-full"
                />
              </FormField>

              <div className="flex items-start pt-2 pb-2">
                <Checkbox
                  id="synthetic-validation"
                  checked={formData.enabled_synthetic_generation}
                  onCheckedChange={(checked) =>
                    onCheckboxChange(
                      "enabled_synthetic_generation",
                      checked as boolean
                    )
                  }
                  className="mt-1"
                />
                <div className="ml-2">
                  <Label
                    htmlFor="synthetic-validation"
                    className="text-sm font-medium"
                  >
                    Synthetic Dataset Validation & Test
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Creates synthetic validation data to help evaluate model
                    performance during and after training.
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>

          <div className="p-6 border-t flex justify-between mt-auto flex-shrink-0">
            {activeStep !== "basics" && (
              <Button variant="outline" onClick={() => setActiveStep("basics")}>
                Back
              </Button>
            )}
            {activeStep === "basics" && (
              <div className="ml-auto">
                <Button
                  onClick={() => setActiveStep("training")}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
            {activeStep === "training" && (
              <div className="space-x-3 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Check className="mr-2 h-4 w-4" /> Create Training Task
                </Button>
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
