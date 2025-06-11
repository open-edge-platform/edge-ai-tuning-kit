// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface TrainingLossChartProps {
  data: number[]
  steps: string[]
}

export function TrainingLossChart({ data, steps }: TrainingLossChartProps) {
  // Format data for recharts
  const chartData = data.map((value, index) => ({
    step: steps[index] || index,
    loss: value,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="step" label={{ value: "Step", position: "insideBottomRight", offset: -10 }} />
        <YAxis label={{ value: "Loss", angle: -90, position: "insideLeft" }} domain={["auto", "auto"]} />
        <Tooltip />
        <Line type="monotone" dataKey="loss" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

