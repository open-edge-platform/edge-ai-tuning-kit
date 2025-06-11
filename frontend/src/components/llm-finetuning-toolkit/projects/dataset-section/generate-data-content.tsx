// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"

interface GenerateDataContentProps {
  onGenerate: (numPairs: number, creativity: number) => void
  onCancel: () => void
}

export function GenerateDataContent({ onGenerate, onCancel }: GenerateDataContentProps) {
  const [numPairs, setNumPairs] = useState(50)
  const [creativity, setCreativity] = useState(0.7)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleGenerate = () => {
    setIsGenerating(true)
    setProgress(0)

    // Simulate generation progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.floor(Math.random() * 5) + 1
      })
    }, 200)

    // Simulate completion
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)

      setTimeout(() => {
        onGenerate(numPairs, creativity)
        setIsGenerating(false)
      }, 500)
    }, 3000)
  }

  return (
    <div className="space-y-4">
      {isGenerating ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Generating {numPairs} message pairs...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="text-sm text-gray-500">
            <p>This may take a few minutes. The AI is analyzing your documents and creating relevant Q&A pairs.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="num-pairs">Number of Pairs: {numPairs}</Label>
              <Slider
                id="num-pairs"
                min={10}
                max={200}
                step={10}
                value={[numPairs]}
                onValueChange={(value) => setNumPairs(value[0])}
              />
              <p className="text-xs text-gray-500">How many message pairs to generate from your documents.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creativity">Creativity Level: {creativity.toFixed(1)}</Label>
              <Slider
                id="creativity"
                min={0}
                max={1}
                step={0.1}
                value={[creativity]}
                onValueChange={(value) => setCreativity(value[0])}
              />
              <p className="text-xs text-gray-500">
                Higher creativity levels will generate more diverse questions but may be less accurate.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-sm text-amber-800">
              This will generate message pairs based on the documents you have uploaded. Make sure you have uploaded
              relevant documents first.
            </p>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isGenerating}>
          Cancel
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Data"}
        </Button>
      </div>
    </div>
  )
}

