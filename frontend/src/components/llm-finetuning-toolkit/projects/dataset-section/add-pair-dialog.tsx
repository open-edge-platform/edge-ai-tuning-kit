// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MarkdownRenderer } from "@/components/llm-finetuning-toolkit/common/markdown";
import { toast } from "sonner";
import type { MessagePair, ChatMessage } from "./types";
import {
  MessageSquare,
  Bot,
  AlertCircle,
  Info,
  Plus,
  Trash2,
  FileText,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddPairContentProps {
  onAddPair: (messages: ChatMessage[]) => void;
  onCancel: () => void;
  editPair?: MessagePair | null;
  onEditPair?: (id: string, messages: ChatMessage[]) => void;
}

export function AddPairContent({
  onAddPair,
  onCancel,
  editPair = null,
  onEditPair,
}: AddPairContentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    editPair?.messages && editPair.messages.length > 0
      ? editPair.messages
      : [
          { role: "user", content: "" },
          { role: "assistant", content: "" },
        ]
  );

  const [isValidating, setIsValidating] = useState(false);
  const isMultiTurn = messages.length > 2;

  const validateMessages = () => {
    const hasEmptyMessages = messages.some(
      (message) => message.content.trim() === ""
    );
    const hasValidPattern = messages.every((message, index) => {
      if (index === 0)
        return message.role === "user" || message.role === "system";
      if (message.role === "user") return messages[index - 1].role !== "user";
      if (message.role === "assistant")
        return messages[index - 1].role !== "assistant";
      return true;
    });
    return !hasEmptyMessages && hasValidPattern;
  };

  const handleSubmit = () => {
    setIsValidating(true);

    if (!validateMessages()) {
      toast.error(
        "All messages must be filled and follow the correct user-assistant pattern."
      );
      setIsValidating(false);
      return;
    }

    if (editPair && onEditPair) {
      onEditPair(editPair.id, messages);
    } else {
      onAddPair(messages);
    }

    setIsValidating(false);
  };

  const addMessage = () => {
    setMessages([
      ...messages,
      { role: "user", content: "" },
      { role: "assistant", content: "" },
    ]);
  };

  const updateMessage = (index: number, content: string) => {
    const newMessages = [...messages];
    newMessages[index].content = content;
    setMessages(newMessages);
  };

  const removeMessage = (index: number) => {
    if (messages.length <= 2) {
      toast.error(
        "A conversation must have at least one user message and one assistant response."
      );
      return;
    }
    const newMessages = messages.filter((_, i) => i !== index);
    setMessages(newMessages);
  };

  const resetToSingleTurn = () => {
    const firstUserMsg = messages.find((m) => m.role === "user")?.content || "";
    const firstAssistantMsg =
      messages.find((m) => m.role === "assistant")?.content || "";
    setMessages([
      { role: "user", content: firstUserMsg },
      { role: "assistant", content: firstAssistantMsg },
    ]);
  };

  return (
    <>
      <div className="flex items-start gap-2 p-3 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
            Best Practices
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            Add high-quality message pairs to train your model. The best pairs
            include detailed questions and comprehensive, accurate responses.
            {isMultiTurn &&
              " For multi-turn conversations, ensure a natural flow between messages."}
          </p>
        </div>
      </div>
      <div className="space-y-4 max-h-[calc(100vh-32rem)] overflow-y-auto pr-2 mb-4">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-slate-800 border rounded-md p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {message.role === "user" ? (
                    <MessageSquare size={16} className="text-blue-600" />
                  ) : (
                    <Bot size={16} className="text-blue-600" />
                  )}
                  <Label className="text-sm font-medium capitalize">
                    {message.role}{" "}
                    {message.role === "user" ? "Message" : "Response"}
                  </Label>
                </div>
                {messages.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMessage(index)}
                    className="h-6 w-6 text-slate-500 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
              <div>
                <Tabs defaultValue="write" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-2 h-9 bg-slate-100 dark:bg-slate-800">
                    <TabsTrigger
                      value="write"
                      className="flex items-center gap-1.5"
                    >
                      <FileText size={14} />
                      <span>Write</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      <span>Preview</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="write" className="mt-0">
                    <textarea
                      placeholder={`Enter ${message.role} ${
                        message.role === "user" ? "message" : "response"
                      } here...`}
                      value={message.content}
                      onChange={(e) => updateMessage(index, e.target.value)}
                      className={`w-full rounded-md border px-3 py-2 text-base shadow-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${
                        isMultiTurn
                          ? "min-h-[40px] max-h-[100px]"
                          : "min-h-[100px] max-h-[200px]"
                      } resize-none transition-all ${
                        isValidating && message.content.trim() === ""
                          ? "border-red-500 ring-red-200"
                          : "focus:ring-blue-100"
                      }`}
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="mt-0">
                    <div className="border rounded-md p-3 bg-white dark:bg-gray-900 min-h-[100px]">
                      {message.content.trim() ? (
                        <MarkdownRenderer content={message.content} />
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 italic">
                          Nothing to preview
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              {isValidating && message.content.trim() === "" && (
                <div className="flex items-center text-red-500 text-xs gap-1 mt-1">
                  <AlertCircle size={12} />
                  <span>
                    {message.role === "user"
                      ? "User message"
                      : "Assistant response"}{" "}
                    is required
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={addMessage}
            className="flex items-center gap-1"
          >
            <Plus size={16} />
            Add Conversation
          </Button>
        </div>
      </div>
      <div className="flex justify-between gap-2">
        {isMultiTurn && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetToSingleTurn}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            Reset to Single-Turn
          </Button>
        )}
        {!isMultiTurn && <div />}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {editPair ? "Save Changes" : "Add Message Pair"}
          </Button>
        </div>
      </div>
    </>
  );
}
