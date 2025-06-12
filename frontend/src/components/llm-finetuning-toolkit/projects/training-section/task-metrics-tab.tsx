// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from "recharts";
import { BarChart2 as BarChartIcon } from "lucide-react";
import {
  Task,
  TrainHistory,
  EvalHistory,
} from "@/hooks/llm-finetuning-toolkit/use-tasks";

export function TaskMetricsTab({ task }: { task: Task }) {
  if (
    !task.results ||
    (!task.results.train_history && !task.results.eval_history)
  ) {
    return (
      <div className="text-center py-4 text-gray-500">
        No metrics available for this training task yet.
      </div>
    );
  }

  // Format a number with default value
  const formatNumber = (
    value: number | string | (string | number)[] | null | undefined,
    defaultValue = "N/A",
    decimals = 4
  ) => {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    // Handle array values (extract the first element if it's an array)
    if (Array.isArray(value)) {
      value = value[0];
      if (value === null || value === undefined) {
        return defaultValue;
      }
    }

    // Use scientific notation for very small numbers (learning rates)
    if (
      typeof value === "number" &&
      value !== 0 &&
      Math.abs(value) < 0.001 &&
      decimals > 4
    ) {
      return value.toExponential(4);
    }

    return typeof value === "number"
      ? value.toFixed(decimals)
      : value.toString();
  };

  // Get training and evaluation entries from the new format
  const trainEntries = task.results.train_history
    ? Object.entries(task.results.train_history)
        .map(([step, data]) => ({
          step: parseInt(step, 10),
          ...(data as TrainHistory),
        }))
        .sort((a, b) => a.step - b.step)
    : [];

  const evalEntries = task.results.eval_history
    ? Object.entries(task.results.eval_history)
        .map(([step, data]) => ({
          step: parseInt(step, 10),
          ...(data as EvalHistory),
        }))
        .sort((a, b) => a.step - b.step)
    : [];

  // Get latest metrics values
  const latestTrainLoss =
    trainEntries.length > 0 ? trainEntries[trainEntries.length - 1].loss : null;

  const latestEvalLoss =
    evalEntries.length > 0
      ? evalEntries[evalEntries.length - 1].eval_loss
      : null;

  // Prepare chart data for training loss
  const trainLossData = trainEntries.map((entry) => ({
    step: entry.step,
    loss: entry.loss,
  }));

  // Prepare chart data for evaluation loss
  const evalLossData = evalEntries.map((entry) => ({
    step: entry.step,
    loss: entry.eval_loss,
  }));

  // Prepare chart data for learning rate with scaled values for better visualization
  const learningRateData = trainEntries.map((entry) => ({
    step: entry.step,
    // Store both the original value and a scaled value (multiply by 1e6 to make it more visible)
    lr: entry.lr,
    scaledLR: entry.lr * 1e6,
  }));

  // Custom tooltip formatting
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length && payload[0]) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-medium">Step: {label}</p>
          <p className="text-blue-600">
            {payload[0].dataKey === "loss" ? "Loss: " : "Loss: "}
            {formatNumber(payload[0].value, "N/A", 4)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for learning rate
  const LearningRateTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (
      active &&
      payload &&
      payload.length &&
      payload[0] &&
      payload[0].value !== undefined
    ) {
      // Get the original learning rate value (not the scaled one)
      const originalValue = payload[0].value / 1e6;
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-medium">Step: {label}</p>
          <p className="text-green-600">
            Learning Rate: {originalValue.toExponential(4)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h5 className="text-sm font-medium mb-2">Training Loss</h5>
          {trainLossData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trainLossData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="step"
                    fontSize={10}
                    label={{
                      value: "Step",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    fontSize={10}
                    label={{
                      value: "Loss",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="loss"
                    stroke="#3b82f6"
                    activeDot={{ r: 4 }}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full bg-gray-100 rounded flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">
                No loss data available
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Current: {formatNumber(latestTrainLoss, "N/A")}
          </div>
        </Card>
        <Card className="p-4">
          <h5 className="text-sm font-medium mb-2">Evaluation Loss</h5>
          {evalLossData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={evalLossData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="step"
                    fontSize={10}
                    label={{
                      value: "Step",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    fontSize={10}
                    label={{
                      value: "Loss",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="loss"
                    stroke="#8b5cf6"
                    activeDot={{ r: 4 }}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full bg-gray-100 rounded flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">
                No evaluation loss data available
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Current: {formatNumber(latestEvalLoss, "N/A")}
          </div>
        </Card>
        <Card className="p-4">
          <h5 className="text-sm font-medium mb-2">Learning Rate</h5>
          {learningRateData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={learningRateData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="step"
                    fontSize={10}
                    label={{
                      value: "Step",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    fontSize={10}
                    dataKey="scaledLR"
                    tickFormatter={(value) => {
                      // Convert back to original value and format to scientific notation
                      const originalValue = value / 1e6;
                      return originalValue.toExponential(1);
                    }}
                    label={{
                      value: "Learning Rate",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip content={<LearningRateTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="scaledLR"
                    name="Learning Rate"
                    stroke="#10b981"
                    activeDot={{ r: 4 }}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full bg-gray-100 rounded flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">
                No learning rate data available
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Current:{" "}
            {trainEntries.length > 0 &&
            trainEntries[trainEntries.length - 1].lr !== undefined &&
            trainEntries[trainEntries.length - 1].lr !== null
              ? trainEntries[trainEntries.length - 1].lr.toExponential(4)
              : "N/A"}
          </div>
        </Card>
        <Card className="p-4">
          <h5 className="text-sm font-medium mb-2">
            Peak Memory Allocation (GB)
          </h5>
          {trainEntries.length > 0 &&
          trainEntries.some(
            (entry) => entry.peak_memory_alloc !== undefined
          ) ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trainEntries.map((entry) => ({
                    step: entry.step,
                    memory: entry.peak_memory_alloc
                      ? entry.peak_memory_alloc / 1e9
                      : null, // Convert to GB
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="step"
                    fontSize={10}
                    label={{
                      value: "Step",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    fontSize={10}
                    label={{
                      value: "Memory (GB)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    formatter={(value) =>
                      value
                        ? [`${formatNumber(value, "N/A", 2)} GB`, "Memory"]
                        : ["N/A", "Memory"]
                    }
                    labelFormatter={(value) => `Step: ${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#f97316"
                    activeDot={{ r: 4 }}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full bg-gray-100 rounded flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">
                No memory allocation data available
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Current:{" "}
            {trainEntries.length > 0 &&
            trainEntries[trainEntries.length - 1]?.peak_memory_alloc
              ? `${(
                  trainEntries[trainEntries.length - 1].peak_memory_alloc / 1e9
                ).toFixed(2)} GB`
              : "N/A"}
          </div>
        </Card>
        <Card className="p-4">
          <h5 className="text-sm font-medium mb-2">
            Peak Memory Reserved (GB)
          </h5>
          {trainEntries.length > 0 &&
          trainEntries.some(
            (entry) => entry.peak_memory_reserved !== undefined
          ) ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trainEntries.map((entry) => ({
                    step: entry.step,
                    memory: entry.peak_memory_reserved
                      ? entry.peak_memory_reserved / 1e9
                      : null, // Convert to GB
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="step"
                    fontSize={10}
                    label={{
                      value: "Step",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    fontSize={10}
                    label={{
                      value: "Memory (GB)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    formatter={(value) =>
                      value
                        ? [`${formatNumber(value, "N/A", 2)} GB`, "Memory"]
                        : ["N/A", "Memory"]
                    }
                    labelFormatter={(value) => `Step: ${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#a855f7"
                    activeDot={{ r: 4 }}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full bg-gray-100 rounded flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">
                No memory reservation data available
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Current:{" "}
            {trainEntries.length > 0 &&
            trainEntries[trainEntries.length - 1]?.peak_memory_reserved
              ? `${(
                  trainEntries[trainEntries.length - 1].peak_memory_reserved /
                  1e9
                ).toFixed(2)} GB`
              : "N/A"}
          </div>
        </Card>
        <Card className="p-4">
          <h5 className="text-sm font-medium mb-2">Tokens per Second (t/s)</h5>
          {trainEntries.length > 0 &&
          trainEntries.some(
            (entry) => entry.tokens_per_second_per_gpu !== undefined
          ) ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trainEntries.map((entry) => ({
                    step: entry.step,
                    tokens_per_second: entry.tokens_per_second_per_gpu,
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="step"
                    fontSize={10}
                    label={{
                      value: "Step",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    fontSize={10}
                    label={{
                      value: "Tokens/Sec",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${formatNumber(value, "N/A", 1)} t/s`,
                      "Speed",
                    ]}
                    labelFormatter={(value) => `Step: ${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="tokens_per_second"
                    stroke="#0ea5e9"
                    activeDot={{ r: 4 }}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full bg-gray-100 rounded flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">
                No tokens per second data available
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Current:{" "}
            {trainEntries.length > 0 &&
            trainEntries[trainEntries.length - 1]?.tokens_per_second_per_gpu
              ? `${formatNumber(
                  trainEntries[trainEntries.length - 1]
                    .tokens_per_second_per_gpu,
                  "N/A",
                  1
                )} t/s`
              : "N/A"}
          </div>
        </Card>
        <Card className="p-4">
          <h5 className="text-sm font-medium mb-2">Mean Train Accuracy (%)</h5>
          {trainEntries.length > 0 &&
          trainEntries.some(
            (entry) => entry.mean_token_accuracy !== undefined
          ) ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trainEntries.map((entry) => ({
                    step: entry.step,
                    accuracy: entry.mean_token_accuracy
                      ? entry.mean_token_accuracy * 100
                      : null,
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="step"
                    fontSize={10}
                    label={{
                      value: "Step",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    fontSize={10}
                    domain={[0, 100]}
                    label={{
                      value: "Accuracy (%)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    formatter={(value) =>
                      value
                        ? [`${formatNumber(value, "N/A", 2)}%`, "Accuracy"]
                        : ["N/A", "Accuracy"]
                    }
                    labelFormatter={(value) => `Step: ${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#22c55e"
                    activeDot={{ r: 4 }}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full bg-gray-100 rounded flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">
                No train accuracy data available
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Current:{" "}
            {trainEntries.length > 0 &&
            trainEntries[trainEntries.length - 1]?.mean_token_accuracy !==
              undefined
              ? `${(
                  trainEntries[trainEntries.length - 1].mean_token_accuracy *
                  100
                ).toFixed(2)}%`
              : "N/A"}
          </div>
        </Card>
        <Card className="p-4">
          <h5 className="text-sm font-medium mb-2">
            Mean Evaluation Accuracy (%)
          </h5>
          {evalEntries.length > 0 &&
          evalEntries.some(
            (entry) => entry.eval_mean_token_accuracy !== undefined
          ) ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={evalEntries.map((entry) => ({
                    step: entry.step,
                    accuracy: entry.eval_mean_token_accuracy
                      ? entry.eval_mean_token_accuracy * 100
                      : null,
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="step"
                    fontSize={10}
                    label={{
                      value: "Step",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    fontSize={10}
                    domain={[0, 100]}
                    label={{
                      value: "Accuracy (%)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    formatter={(value) =>
                      value
                        ? [`${formatNumber(value, "N/A", 2)}%`, "Accuracy"]
                        : ["N/A", "Accuracy"]
                    }
                    labelFormatter={(value) => `Step: ${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#ec4899"
                    activeDot={{ r: 4 }}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full bg-gray-100 rounded flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">
                No evaluation accuracy data available
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Current:{" "}
            {evalEntries.length > 0 &&
            evalEntries[evalEntries.length - 1]?.eval_mean_token_accuracy !==
              undefined
              ? `${(
                  evalEntries[evalEntries.length - 1].eval_mean_token_accuracy *
                  100
                ).toFixed(2)}%`
              : "N/A"}
          </div>
        </Card>
      </div>
    </div>
  );
}
