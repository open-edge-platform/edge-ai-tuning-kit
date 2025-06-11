// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface AddPairContentProps {
  onAddPair: (userMessage: string, assistantMessage: string) => void
  onCancel: () => void
}

export function AddPairContent({ onAddPair, onCancel }: AddPairContentProps) {
  const [userMessage, setUserMessage] = useState("")
  const [assistantMessage, setAssistantMessage] = useState("")

  const handleSubmit = () => {
    if (userMessage.trim() === "" || assistantMessage.trim() === "") {
      toast.error("Both user and assistant messages are required.")
      return
    }

    onAddPair(userMessage, assistantMessage)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user-message">User Message</Label>
        <Textarea
          id="user-message"
          placeholder="Enter user message here..."
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assistant-message">Assistant Message</Label>
        <Textarea
          id="assistant-message"
          placeholder="Enter assistant response here..."
          value={assistantMessage}
          onChange={(e) => setAssistantMessage(e.target.value)}
          className="min-h-[150px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Add Message Pair</Button>
      </div>
    </div>
  )
}

