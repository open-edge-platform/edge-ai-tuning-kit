// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"

// Mock data - this would normally come from your backend
const initialHardwareData = {
  gpu: {
    utilization: 64,
    memory: 78,
    temperature: 67,
    power: 82,
    model: "Intel® Arc™ B580 Graphics",
    vram: "12GB",
  },
  cpu: {
    utilization: 42,
    cores: [38, 56, 42, 30, 25, 48, 62, 41, 35, 29, 45, 52, 47, 39, 33, 27],
    temperature: 58,
    model: "Intel® Core™ i7 processor 14700K",
    threads: 28,
  },
  memory: {
    utilization: 56,
    total: "64GB",
    available: "28.2GB",
    used: "35.8GB",
  },
  storage: {
    utilization: 72,
    total: "2TB",
    available: "560GB",
    used: "1.44TB",
  },
}

export function HardwareMonitor() {
  const [hardwareData, setHardwareData] = useState(initialHardwareData)

  // Mock the update of hardware stats every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHardwareData((prev) => ({
        ...prev,
        gpu: {
          ...prev.gpu,
          utilization: Math.floor(Math.random() * 30) + 50,
          memory: Math.floor(Math.random() * 20) + 70,
          temperature: Math.floor(Math.random() * 10) + 60,
        },
        cpu: {
          ...prev.cpu,
          utilization: Math.floor(Math.random() * 20) + 35,
          cores: prev.cpu.cores.map(() => Math.floor(Math.random() * 70) + 20),
          temperature: Math.floor(Math.random() * 8) + 55,
        },
        memory: {
          ...prev.memory,
          utilization: Math.floor(Math.random() * 15) + 50,
        },
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gpu">GPU</TabsTrigger>
          <TabsTrigger value="cpu">CPU</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <HardwareCard
              title="GPU"
              description={hardwareData.gpu.model}
              value={hardwareData.gpu.utilization}
              label="Utilization"
              detail={`${hardwareData.gpu.temperature}°C • ${hardwareData.gpu.vram}`}
            />
            <HardwareCard
              title="CPU"
              description={hardwareData.cpu.model}
              value={hardwareData.cpu.utilization}
              label="Utilization"
              detail={`${hardwareData.cpu.temperature}°C • ${hardwareData.cpu.threads} Threads`}
            />
            <HardwareCard
              title="Memory"
              description={hardwareData.memory.total}
              value={hardwareData.memory.utilization}
              label="Utilization"
              detail={`${hardwareData.memory.used} Used`}
            />
            <HardwareCard
              title="Storage"
              description={hardwareData.storage.total}
              value={hardwareData.storage.utilization}
              label="Utilization"
              detail={`${hardwareData.storage.used} Used`}
            />
          </div>
        </TabsContent>

        <TabsContent value="gpu">
          <Card>
            <CardHeader>
              <CardTitle>GPU Details</CardTitle>
              <CardDescription>
                {hardwareData.gpu.model} • {hardwareData.gpu.vram}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Utilization</span>
                  <span>{hardwareData.gpu.utilization}%</span>
                </div>
                <Progress value={hardwareData.gpu.utilization} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory</span>
                  <span>{hardwareData.gpu.memory}%</span>
                </div>
                <Progress value={hardwareData.gpu.memory} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Temperature</span>
                  <span>{hardwareData.gpu.temperature}°C</span>
                </div>
                <Progress value={(hardwareData.gpu.temperature / 100) * 100} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Power</span>
                  <span>{hardwareData.gpu.power}%</span>
                </div>
                <Progress value={hardwareData.gpu.power} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cpu">
          <Card>
            <CardHeader>
              <CardTitle>CPU Details</CardTitle>
              <CardDescription>
                {hardwareData.cpu.model} • {hardwareData.cpu.threads} Threads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Utilization</span>
                  <span>{hardwareData.cpu.utilization}%</span>
                </div>
                <Progress value={hardwareData.cpu.utilization} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Temperature</span>
                  <span>{hardwareData.cpu.temperature}°C</span>
                </div>
                <Progress value={(hardwareData.cpu.temperature / 100) * 100} />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-medium">Core Utilization</h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {hardwareData.cpu.cores.map((core, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Core {index + 1}</span>
                        <span>{core}%</span>
                      </div>
                      <Progress value={core} className="h-1" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory">
          <Card>
            <CardHeader>
              <CardTitle>Memory Details</CardTitle>
              <CardDescription>{hardwareData.memory.total} Total</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span>{hardwareData.memory.utilization}%</span>
                </div>
                <Progress value={hardwareData.memory.utilization} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Used Memory</h4>
                  <p className="text-2xl font-bold">{hardwareData.memory.used}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Available Memory</h4>
                  <p className="text-2xl font-bold">{hardwareData.memory.available}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface HardwareCardProps {
  title: string
  description: string
  value: number
  label: string
  detail: string
}

function HardwareCard({ title, description, value, label, detail }: HardwareCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{value}%</div>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </div>
        <Progress value={value} className="mt-3" />
      </CardContent>
    </Card>
  )
}

