// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task } from "@/hooks/llm-finetuning-toolkit/use-tasks";

interface TaskParametersTabProps {
  task: Task;
}

export function TaskParametersTab({ task }: TaskParametersTabProps) {
  // Format a value for display
  const formatValue = (
    value: string | number | boolean | null,
    key?: string
  ) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    // Special handling for num_gpus parameter specifically
    if (key === "num_gpus" || key === "Num gpus") {
      if (value === -1 || value === "-1") return "All available GPUs";
      if (value === 1 || value === "1") return "Single GPU";
    }

    if (typeof value === "number") {
      // Format small numbers in scientific notation
      if (value !== 0 && Math.abs(value) < 0.001) {
        return value.toExponential(4);
      }
      // Format to 4 decimal places maximum
      return value.toString().includes(".")
        ? value.toFixed(4)
        : value.toString();
    }
    return value.toString();
  };

  // Check if configs is available
  if (!task.configs) {
    return (
      <div className="text-center py-8 text-gray-500">
        No training parameters available for this task.
      </div>
    );
  }

  const { model_args, training_args, dataset_args, training_configs } =
    task.configs;

  // Extract all parameters from the nested configs structure
  const modelParameters = model_args
    ? [
        { label: "Model Path", value: model_args.model_name_or_path },
        { label: "Device", value: model_args.device },
        { label: "Task Type", value: model_args.task_type },
      ]
    : [];

  const trainingParameters = training_args
    ? Object.entries(training_args)
        .filter(([key]) => key !== "output_dir")
        .map(([key, value]) => ({
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          value,
        }))
    : [];

  const datasetParameters = dataset_args
    ? Object.entries(dataset_args)
        .filter(([key]) => key !== "tools_path")
        .filter(([key]) => key !== "train_dataset_path")
        .filter(([key]) => key !== "eval_dataset_path")
        .filter(([key]) => key !== "test_dataset_path")
        .map(([key, value]) => ({
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          value,
        }))
    : [];

  const configParameters = training_configs
    ? Object.entries(training_configs).map(([key, value]) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        value,
      }))
    : [];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="model" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="model">Model</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="dataset">Dataset</TabsTrigger>
          <TabsTrigger value="configs">Configs</TabsTrigger>
        </TabsList>

        {/* Model Parameters */}
        <TabsContent value="model">
          <Card>
            <CardContent className="p-4">
              {modelParameters.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {modelParameters.map((param) => (
                    <div key={param.label} className="border rounded p-2">
                      <div className="text-xs text-gray-500">{param.label}</div>
                      <div className="font-medium">
                        {formatValue(
                          param.value as string | number | boolean | null,
                          param.label.toLowerCase().replace(/\s/g, "_")
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No model parameters available.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Parameters */}
        <TabsContent value="training">
          <Card>
            <CardContent className="p-4">
              {trainingParameters.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {trainingParameters.map((param) => (
                    <div key={param.label} className="border rounded p-2">
                      <div className="text-xs text-gray-500">{param.label}</div>
                      <div className="font-medium">
                        {formatValue(
                          param.value as string | number | boolean | null,
                          param.label.toLowerCase().replace(/\s/g, "_")
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No training parameters available.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dataset Parameters */}
        <TabsContent value="dataset">
          <Card>
            <CardContent className="p-4">
              {datasetParameters.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {datasetParameters.map((param) => (
                    <div key={param.label} className="border rounded p-2">
                      <div className="text-xs text-gray-500">{param.label}</div>
                      <div className="font-medium">
                        {formatValue(
                          param.value as string | number | boolean | null,
                          param.label.toLowerCase().replace(/\s/g, "_")
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No dataset parameters available.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Parameters */}
        <TabsContent value="configs">
          <Card>
            <CardContent className="p-4">
              {configParameters.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {configParameters.map((param) => (
                    <div key={param.label} className="border rounded p-2">
                      <div className="text-xs text-gray-500">{param.label}</div>
                      <div className="font-medium">
                        {formatValue(
                          param.value as string | number | boolean | null,
                          param.label.toLowerCase().replace(/\s/g, "_")
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No additional configuration parameters available.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
