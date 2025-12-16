// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

"use client";

import type React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Loader2,
  Settings,
  RefreshCw,
  Cpu,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from 'ai';
import { useChat } from "@ai-sdk/react";
import { MarkdownRenderer } from "@/components/llm-finetuning-toolkit/common/markdown";
import {
  useStartInferenceService,
  useStopInferenceService,
  useGetModelId,
} from "@/hooks/llm-finetuning-toolkit/use-services";

interface ModelEvaluationProps {
  task: {
    id: string | number;
    model?: string;
    accuracy?: number;
    perplexity?: number;
    inference_configs?: {
      temperature?: number;
      max_new_tokens?: number;
      prompt_template?: string;
      isRAG?: boolean;
    };
    type?: string;
  };
  onClose: () => void;
}

export function ModelEvaluation({ task, onClose }: ModelEvaluationProps) {
  const queryClient = useQueryClient();
  // Service states: START, WAIT, READY, STOP, FAIL
  const [evaluationState, setEvaluationState] = useState("START");
  const [currentModelID, setCurrentModelID] = useState("");
  const [currentDevice, setCurrentDevice] = useState("cpu");

  // UI states
  const [showSettings, setShowSettings] = useState(false);
  const [displayMode, setDisplayMode] = useState<"text" | "markdown">("text");
  const [showSystemMessages, setShowSystemMessages] = useState(false); // Add state for showing/hiding system messages
  const [temperature, setTemperature] = useState(
    task.inference_configs?.temperature !== undefined
      ? task.inference_configs.temperature
      : 0.3
  );
  const [maxTokens, setMaxTokens] = useState(
    task.inference_configs?.max_new_tokens !== undefined
      ? task.inference_configs.max_new_tokens
      : 512
  );
  const [systemPrompt, setSystemPrompt] = useState(
    task.inference_configs?.prompt_template !== undefined
      ? task?.inference_configs?.prompt_template
      : "You are a helpful assistant."
  );
  const [editingPrompt, setEditingPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Service hooks
  const { data: modelID, resetData } = useGetModelId(
    evaluationState === "WAIT",
    currentDevice
  );
  const startInferenceService = useStartInferenceService();
  const stopInferenceService = useStopInferenceService();

  const [input, setInput] = useState('');
  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/llm-finetuning-toolkit/api/chat',
    }),
    onError: () => {
      setEvaluationState("FAIL");
    },
  });
  const chatBody = useMemo(
    () => ({
      modelID: currentModelID,
      max_tokens: maxTokens,
      temperature,
      systemPrompt
    }),
    [currentModelID, maxTokens, temperature, systemPrompt]
  );
  const sendUserMessage = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (input.trim() === "") return;
    sendMessage({text: input}, { body: chatBody });
    setInput("");
  }


  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update settings and reset messages when task changes
  useEffect(() => {
    // Update settings if they exist in task
    if (task?.inference_configs) {
      if (task.inference_configs.temperature !== undefined) {
        setTemperature(task.inference_configs.temperature);
      }
      if (task.inference_configs.max_new_tokens !== undefined) {
        setMaxTokens(task.inference_configs.max_new_tokens);
      }
    }
  }, [task.id]); // Only depend on task.id to ensure it runs when task changes

  // Initialize the service on component mount - only once
  useEffect(() => {
    const initService = async () => {
      try {
        const response = await startInferenceService.mutateAsync({
          id: Number(task.id),
        });
        if (!response.status) {
          setEvaluationState("FAIL");
        } else {
          setEvaluationState("WAIT");
        }
      } catch (err) {
        console.error("Error starting inference service:", err);
        setEvaluationState("FAIL");
      }
    };

    initService();

    // Cleanup on unmount
    return () => {
      if (currentModelID) {
        stopInferenceService.mutate(
          { id: Number(task.id) },
          {
            onSuccess: () => {
              queryClient.removeQueries({ queryKey: ["models"] });
            },
          }
        );
      }
    };
  }, [task.id]); // Only depend on task.id to ensure it runs just once per task

  // Watch for model ID updates when waiting for service to start
  useEffect(() => {
    if (modelID && evaluationState === "WAIT") {
      try {
        // If modelID.status is false, keep waiting
        if (modelID.status === false) {
          return; // Keep evaluation state as WAIT
        }

        if (modelID?.data?.data && modelID.data.data.length > 0) {
          const modelIDString = String(modelID.data.data[0].id);
          const modelIDList = modelIDString.split("/");
          const taskIDFromModelID = modelIDList[3];

          if (parseInt(taskIDFromModelID) === Number(task.id)) {
            setCurrentModelID(modelIDString);
            setEvaluationState("READY");
          }
        } else {
          console.log("Model ID data is not in the expected format:", modelID);
        }
      } catch (error) {
        console.error("Error processing model ID:", error);
      }
    }
  }, [modelID, evaluationState, task.id]);

  // Handle device selection and service restart
  const handleStartChat = (device: string): void => {
    const startService = (): void => {
      setEvaluationState("START");
      setCurrentDevice(device);
      startInferenceService.mutate(
        { id: Number(task.id), device },
        {
          onSuccess: (response) => {
            if (!response.status) {
              setEvaluationState("FAIL");
            } else {
              setEvaluationState("WAIT");
            }
          },
        }
      );
    };

    if (currentModelID) {
      stopInferenceService.mutate(
        { id: Number(task.id) },
        {
          onSuccess: (response) => {
            if (!response.status) {
              setEvaluationState("FAIL");
            } else {
              queryClient.removeQueries({ queryKey: ["models"] });
              setCurrentModelID("");

              if (currentDevice === device) {
                setEvaluationState("STOP");
              } else {
                // If device was changed, restart the service with new device
                startService();
              }
            }
          },
        }
      );
    } else {
      startService();
    }
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const handleClearMessages = () => {
    setInput("");
    setMessages([]);
  };

  const handleStopService = () => {
    if (currentModelID) {
      stopInferenceService.mutate(
        { id: Number(task.id) },
        {
          onSuccess: (response) => {
            if (response.status) {
              // Clear all model-related cached queries
              queryClient.removeQueries({ queryKey: ["models"] });

              // Explicitly clear the current model ID state
              setCurrentModelID("");

              // Reset the model data in the query to force a fresh fetch next time
              resetData();
              setEvaluationState("STOP");
              handleClearMessages();
            }
          },
          onError: () => {
            setCurrentModelID("");
            resetData();
            setEvaluationState("STOP");
          },
        }
      );
    }
  };

  // Render the evaluation state UI
  const renderEvaluationState = () => {
    switch (evaluationState) {
      case "START":
        return (
          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-md">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <p>Starting the inference service...</p>
          </div>
        );
      case "WAIT":
        return (
          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-md">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <p>Waiting for the model to be ready...</p>
          </div>
        );
      case "READY":
        // Return an empty div since the actual messages will be rendered in the main component
        return null;
      case "FAIL":
        return (
          <div className="flex flex-col items-center justify-center p-4 bg-destructive/10 rounded-md">
            <XCircle className="h-5 w-5 text-destructive mb-2" />
            <p className="text-center mb-2">Failed to start the service.</p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEvaluationState("START");
                  queryClient.removeQueries({ queryKey: ["models"] });
                  startInferenceService.mutate({ id: Number(task.id) });
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        );
      case "STOP":
        return (
          <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-md">
            <p className="text-center mb-2">
              Service is stopped. Choose a device to start evaluation.
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartChat("cpu")}
              >
                <Cpu className="h-4 w-4 mr-2" /> CPU
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartChat("xpu")}
              >
                <Cpu className="h-4 w-4 mr-2" /> GPU
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 h-[calc(100vh-4rem)]">
      <div
        className={`flex flex-col h-full ${
          showSettings
            ? "col-span-1 md:col-span-2 lg:col-span-3"
            : "col-span-1 md:col-span-3 lg:col-span-4"
        }`}
      >
        <Card className="border-2 flex-1 flex flex-col mb-6 h-full overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="pl-0"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
              </Button>
              <Button
                variant={showSettings ? "default" : "outline"}
                size="sm"
                onClick={toggleSettings}
                className="ml-auto"
              >
                <Settings className="h-4 w-4 mr-2" />
                {showSettings ? "Hide Settings" : "Show Settings"}
              </Button>
            </div>
            <CardTitle className="mt-2">Evaluation</CardTitle>
            <CardDescription>
              Interact with your fine-tuned model to evaluate its performance
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {task.type && <Badge variant="outline">{task.type}</Badge>}
              {task.model && <Badge variant="outline">{task.model}</Badge>}
              <Badge variant="secondary">Max Tokens: {maxTokens}</Badge>
              <Badge variant="secondary">Temp: {temperature.toFixed(2)}</Badge>
              <Badge variant={currentDevice === "xpu" ? "default" : "outline"}>
                {currentDevice === "xpu" ? (
                  <Cpu className="h-4 w-4 mr-2" />
                ) : (
                  <Cpu className="h-4 w-4 mr-2" />
                )}
                {currentDevice === "xpu" ? "GPU" : "CPU"}
              </Badge>
              <Badge
                variant={displayMode === "markdown" ? "default" : "outline"}
              >
                Format: {displayMode === "markdown" ? "Markdown" : "Plain Text"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            {evaluationState !== "READY" ? (
              <div className="px-6 py-4 flex-1 flex items-center justify-center">
                {renderEvaluationState()}
              </div>
            ) : (
              <>
                <div className="flex flex-col h-[calc(100vh-20rem)] pb-4 overflow-hidden">
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto px-6 pt-2 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  >
                    {messages
                      .filter(
                        (message) =>
                          showSystemMessages || message.role !== "system"
                      )
                      .map((message) => (
                        <div
                          key={message.id}
                          className={`flex mb-4 ${
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          {(message.role === "assistant" ||
                            message.role === "system") && (
                            <Avatar
                              className={`h-8 w-8 mr-2 flex-shrink-0 ${
                                message.role === "system"
                                  ? "bg-purple-500 text-white"
                                  : "bg-green-500 text-white"
                              }`}
                            >
                              <AvatarFallback
                                className={`${
                                  message.role === "system"
                                    ? "bg-purple-500 text-white"
                                    : "bg-green-500 text-white"
                                }`}
                              >
                                {message.role === "system" ? (
                                  <Settings className="h-4 w-4" />
                                ) : (
                                  <Bot className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              message.role === "system"
                                ? "max-w-[90%]"
                                : "max-w-[80%]"
                            } ${
                              message.role === "system"
                                ? "bg-purple-100 dark:bg-purple-900/30 text-foreground border border-purple-200 dark:border-purple-800"
                                : message.role === "assistant"
                                ? "bg-green-100 dark:bg-green-900/30 text-foreground border border-green-200 dark:border-green-800"
                                : "bg-blue-100 dark:bg-blue-900/30 text-foreground border border-blue-200 dark:border-blue-800"
                            } break-words overflow-hidden`}
                          >
                            {displayMode === "markdown" ? (
                              <div className="markdown-content overflow-x-auto">
                                <MarkdownRenderer
                                  content={message.parts
                                    .map(
                                      (part) => {
                                        if (part.type === "text" && part.text !== undefined) {
                                          return part.text.trimStart();
                                        } else {
                                          return "";
                                        }
                                      }
                                    )
                                    .join("")
                                  }
                                />
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap overflow-x-auto">
                                {message.parts
                                  .map(
                                    (part) => {
                                      if (part.type === "text" && part.text !== undefined) {
                                        return part.text.trimStart();
                                      } else {
                                        return "";
                                      }
                                    }
                                  )
                                  .join("")
                                }
                              </p>
                            )}
                          </div>
                          {message.role === "user" && (
                            <Avatar className="h-8 w-8 ml-2 flex-shrink-0 bg-blue-500 text-white">
                              <AvatarFallback className="bg-blue-500 text-white">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}

                    {/* Placeholder message when there are no user or assistant messages */}
                    {messages.filter(
                      (m) => m.role === "user" || m.role === "assistant"
                    ).length === 0 && (
                      <div className="flex justify-center items-center h-40">
                        <div className="px-6 py-4 rounded-lg bg-muted/40 border border-muted/60 text-muted-foreground text-center max-w-md shadow-sm">
                          <Bot className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                          <h4 className="text-sm font-medium mb-1">
                            Start a New Conversation
                          </h4>
                          <p className="text-xs">
                            Type a message below to interact with your
                            fine-tuned model and evaluate its responses.
                          </p>
                        </div>
                      </div>
                    )}
                    {status === "submitted" && (
                      <div className="flex mb-4 justify-start">
                        <Avatar className="h-8 w-8 mr-2 flex-shrink-0 bg-green-500 text-white">
                          <AvatarFallback className="bg-green-500 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-foreground border border-green-200 dark:border-green-800">
                          <div className="flex space-x-1 items-center h-6">
                            <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-bounce"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {status === "error" && (
                      <div className="flex mb-4 justify-start">
                        <Avatar className="h-8 w-8 mr-2 flex-shrink-0 bg-red-500 text-white">
                          <AvatarFallback className="bg-red-500 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-foreground border border-red-200 dark:border-red-800">
                          <div className="flex items-center">
                            <XCircle className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                            <span className="text-sm">
                              Error generating response. Please try again.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto px-6 pb-3 flex-shrink-0">
                  <form
                    onSubmit={e => sendUserMessage(e)}
                    className="flex items-center gap-2 w-full"
                  >
                    <Textarea
                      placeholder="Type your message... (Shift+Enter for new line)"
                      value={input}
                      onChange={e => {
                        setInput(e.target.value);
                      }}
                      onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendUserMessage(e);
                        }
                      }}
                      className="flex-1 min-h-[40px] max-h-[200px]"
                      rows={1}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={handleClearMessages}
                      title="Reset conversation"
                      className="flex-shrink-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !input.trim() ||
                        status === "streaming" ||
                        status === "submitted"
                      }
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Column - Shows when toggled */}
      {showSettings && (
        <div className="md:col-span-1 animate-in fade-in duration-200 mb-6">
          <Card className="border-2 h-full overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-lg">Model Settings</CardTitle>
              <CardDescription>
                Adjust parameters to see how they affect the responses of the
                model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Inference Device</Label>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={currentDevice === "cpu" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => handleStartChat("cpu")}
                      disabled={
                        evaluationState === "START" ||
                        evaluationState === "WAIT" ||
                        evaluationState === "READY"
                      }
                    >
                      <Cpu className="h-4 w-4 mr-2" /> CPU
                    </Button>
                    <Button
                      size="sm"
                      variant={currentDevice === "xpu" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => handleStartChat("xpu")}
                      disabled={
                        evaluationState === "START" ||
                        evaluationState === "WAIT" ||
                        evaluationState === "READY"
                      }
                    >
                      <Cpu className="h-4 w-4 mr-2" /> GPU
                    </Button>
                  </div>
                  {(evaluationState === "READY" ||
                    evaluationState === "FAIL") && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopService}
                      className="w-full"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Stop {currentDevice === "xpu" ? "GPU" : "CPU"} Service
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the hardware to run inference on. GPU offers faster
                  performance.
                  {(evaluationState === "READY" ||
                    evaluationState === "WAIT" ||
                    evaluationState === "FAIL") &&
                    " Use the stop button to terminate the current service."}
                </p>
              </div>

              {/* System Prompt - Updated to be editable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingPrompt(!editingPrompt)}
                  >
                    {editingPrompt ? "Cancel" : "Edit"}
                  </Button>
                </div>
                <Separator className="my-2" />
                {!editingPrompt ? (
                  <div className="bg-muted p-2 rounded-md max-h-48 overflow-y-auto">
                    <p className="text-xs whitespace-pre-wrap">
                      {systemPrompt}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      id="systemPrompt"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="min-h-[100px] font-mono text-xs resize-y"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        // Update system message in the chat
                        setMessages(
                          messages.map((msg) =>
                            msg.role === "system"
                              ? { ...msg, content: systemPrompt }
                              : msg
                          )
                        );
                        setEditingPrompt(false);
                      }}
                      disabled={!systemPrompt.trim()}
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  This is the system prompt that guides how the model behaves.
                  Edit to change the persona or instructions of the model.
                </p>
              </div>

              {/* Temperature Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">
                    Temperature: {temperature.toFixed(2)}
                  </Label>
                </div>
                <Slider
                  id="temperature"
                  min={0.01}
                  max={1}
                  step={0.01}
                  value={[temperature]}
                  onValueChange={(value) => setTemperature(value[0])}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Controls randomness: Lower values are more focused, higher
                  values more creative.
                </p>
              </div>

              {/* Max Tokens Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxTokens">Max Tokens: {maxTokens}</Label>
                </div>
                <Slider
                  id="maxTokens"
                  min={1}
                  max={2048}
                  step={1}
                  value={[maxTokens]}
                  onValueChange={(value) => setMaxTokens(value[0])}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of tokens the model will generate in its
                  response.
                </p>
              </div>

              {/* Message Display Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="displayMode">Message Display Format</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={displayMode === "text" ? "default" : "outline"}
                      onClick={() => setDisplayMode("text")}
                    >
                      Plain Text
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        displayMode === "markdown" ? "default" : "outline"
                      }
                      onClick={() => setDisplayMode("markdown")}
                    >
                      Markdown
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose how to display messages. Markdown renders formatting
                  like bold, lists, and code blocks.
                </p>
              </div>

              {/* System Messages Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="systemMessages">System Messages</Label>
                  <Button
                    size="sm"
                    variant={showSystemMessages ? "default" : "outline"}
                    onClick={() => setShowSystemMessages(!showSystemMessages)}
                  >
                    {showSystemMessages ? "Show" : "Hide"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Toggle visibility of system messages that instruct the model
                  how to behave.
                </p>
              </div>

              {/* RAG Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rag">
                    Retrieval-Augmented Generation (RAG)
                  </Label>
                  <Button
                    size="sm"
                    variant={
                      task.inference_configs?.isRAG ? "default" : "outline"
                    }
                    className={`${
                      task.inference_configs?.isRAG ? "" : "bg-muted/50"
                    }`}
                    disabled={true}
                    title="RAG is not available for this evaluation"
                  >
                    {task.inference_configs?.isRAG ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Augment model responses with information from your knowledge
                  base.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
