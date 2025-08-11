"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Message, OllamaModel, MessageMetrics } from "@/lib/types"
import { useChatStore } from "@/lib/store"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import MetricsDisplay from "@/components/MetricsDisplay"
import OllamaStatusIndicator from "@/components/OllamaStatusIndicator"
import type { OllamaStatus } from "@/app/api/ollama/status/route"
import {
  Send,
  StopCircle,
  User,
  Trash2,
  AlertCircle,
  Activity,
  Eye,
  EyeOff,
  MessageSquarePlus,
  Menu,
} from "lucide-react"

export default function Chat() {
  // Zustand store
  const {
    conversations,
    selectedModel,
    isLoading,
    error,
    hasHydrated,
    showMetrics,
    currentMetrics,
    showSidebar,
    getCurrentConversation,
    createConversation,
    addMessage,
    updateMessage,
    clearCurrentMessages,
    setSelectedModel,
    setLoading,
    setError,
    setShowMetrics,
    setCurrentMetrics,
    setShowSidebar,
  } = useChatStore()

  // Get current conversation and messages
  const currentConversation = getCurrentConversation()
  const messages = useMemo(
    () => currentConversation?.messages || [],
    [currentConversation]
  )

  // Local state for input and models
  const [input, setInput] = useState("")
  const [models, setModels] = useState<OllamaModel[]>([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Find current model info
  const currentModelInfo = models.find((m) => m.name === selectedModel)

  // Handle Ollama status changes
  const handleOllamaStatusChange = useCallback(
    (status: OllamaStatus) => {
      setOllamaStatus(status)

      // Clear error if Ollama is now connected
      if (status.status === "connected" && error?.includes("Ollama")) {
        setError(null)
      }

      // Set error if Ollama is not available and we don't have models
      if (status.status !== "connected" && models.length === 0) {
        setError(status.message)
      }
    },
    [error, models.length, setError]
  )

  // Fetch models
  const fetchModels = useCallback(async () => {
    // Only fetch models if Ollama is connected
    if (ollamaStatus?.status !== "connected") {
      return
    }

    try {
      const response = await fetch("/api/models")
      if (!response.ok) {
        throw new Error("Failed to fetch models")
      }
      const data = await response.json()
      const availableModels = data.models || []
      setModels(availableModels)
      setModelsLoaded(true)

      // Only set default model if none is selected AND we've hydrated
      if (hasHydrated && availableModels.length > 0) {
        // Check if the selected model exists in available models
        const modelExists = availableModels.some(
          (m: OllamaModel) => m.name === selectedModel
        )

        if (!selectedModel || !modelExists) {
          // Set to first available model if current selection is invalid
          setSelectedModel(availableModels[0].name)
        }
      }
    } catch (error) {
      console.error("Error fetching models:", error)
      setError("Failed to fetch models. Make sure Ollama is running.")
      setModelsLoaded(true)
    }
  }, [
    ollamaStatus?.status,
    selectedModel,
    setSelectedModel,
    setError,
    hasHydrated,
  ])

  // Fetch models when Ollama status changes to connected
  useEffect(() => {
    if (hasHydrated && ollamaStatus?.status === "connected") {
      fetchModels()
    }
  }, [hasHydrated, ollamaStatus?.status, fetchModels])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleNewChat = () => {
    createConversation("New Chat", selectedModel)
    setInput("")
    setError(null)
    setCurrentMetrics(null)
  }

  const sendMessage = async () => {
    if (!input.trim() || !selectedModel) return

    // Check if Ollama is connected before sending
    if (ollamaStatus?.status !== "connected") {
      setError("Ollama is not connected. Please ensure Ollama is running.")
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    // Add user message
    addMessage(userMessage)
    setInput("")
    setLoading(true)
    setError(null)
    setCurrentMetrics(null) // Clear previous metrics

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
      model: selectedModel,
    }

    // Add placeholder for assistant
    addMessage(assistantMessage)

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let fullContent = ""
      let messageMetrics: MessageMetrics | null = null

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)

            if (data === "[DONE]") {
              // Update message with final metrics
              updateMessage(assistantMessage.id, {
                isStreaming: false,
                metrics: messageMetrics || undefined,
              })
              setCurrentMetrics(null)
              break
            }

            try {
              const parsed = JSON.parse(data)

              // Handle content updates
              if (parsed.content) {
                fullContent += parsed.content
                updateMessage(assistantMessage.id, { content: fullContent })
              }

              // Handle metrics updates
              if (parsed.metrics) {
                messageMetrics = parsed.metrics
                setCurrentMetrics(parsed.metrics)

                // If this is the final metrics update, attach to message
                if (parsed.done) {
                  updateMessage(assistantMessage.id, {
                    metrics: parsed.metrics,
                  })
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.log("Request aborted")
          updateMessage(assistantMessage.id, { isStreaming: false })
        } else {
          console.error("Error sending message:", error)
          setError(error.message || "Failed to send message")
        }
      }
    } finally {
      setLoading(false)
      setCurrentMetrics(null)
      abortControllerRef.current = null
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
      setCurrentMetrics(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Don't render until hydrated to prevent mismatch
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Check if we can send messages
  const canSendMessage =
    input.trim() &&
    selectedModel &&
    ollamaStatus?.status === "connected" &&
    !isLoading

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowSidebar(!showSidebar)}
              variant="ghost"
              size="icon"
              title="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <Image
              src="/llama-icon.png"
              alt="Ollama"
              width={32}
              height={32}
              className="rounded-md"
            />
            <h1 className="text-xl font-bold hidden sm:block">Ollama Chat</h1>
            {currentConversation && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {currentConversation.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Ollama Status Indicator */}
            <OllamaStatusIndicator
              compact
              onStatusChange={handleOllamaStatusChange}
            />

            <Button
              onClick={handleNewChat}
              variant="ghost"
              size="icon"
              title="New chat"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowMetrics(!showMetrics)}
              variant="ghost"
              size="icon"
              title={showMetrics ? "Hide metrics" : "Show metrics"}
            >
              {showMetrics ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={clearCurrentMessages}
              variant="ghost"
              size="icon"
              disabled={messages.length === 0 || isLoading}
              title="Clear current chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={!modelsLoaded || ollamaStatus?.status !== "connected"}
            >
              <SelectTrigger className="w-[200px] hidden sm:flex">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.name} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Messages Container */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
            <div className="max-w-4xl mx-auto p-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                    <Image
                      src="/llama-icon.png"
                      alt="Ollama"
                      width={64}
                      height={64}
                      className="rounded-lg"
                    />
                  </div>
                  <p className="text-lg font-medium mb-2">
                    {conversations.length === 0
                      ? "Welcome to Ollama Chat!"
                      : "Start a new conversation"}
                  </p>
                  <p>
                    {ollamaStatus?.status === "connected"
                      ? conversations.length === 0
                        ? "Send a message below to begin"
                        : "Type a message or select a conversation from the sidebar"
                      : "Please ensure Ollama is running to start chatting"}
                  </p>
                  {selectedModel && ollamaStatus?.status === "connected" && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      Using model: {selectedModel}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div
                      className={`flex gap-3 ${
                        message.role === "assistant"
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.role === "assistant"
                            ? "flex-row"
                            : "flex-row-reverse"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {message.role === "assistant" ? (
                            <Image
                              src="/llama-icon.png"
                              alt="Ollama"
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                              <User className="w-4 h-4 text-secondary-foreground" />
                            </div>
                          )}
                        </div>
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.role === "assistant"
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse-cursor" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Show metrics for completed assistant messages */}
                    {message.role === "assistant" &&
                      message.metrics &&
                      showMetrics &&
                      !message.isStreaming && (
                        <div className="flex justify-start pl-11">
                          <MetricsDisplay
                            metrics={message.metrics}
                            model={message.model}
                            modelInfo={models.find(
                              (m) => m.name === message.model
                            )}
                            className="max-w-sm"
                          />
                        </div>
                      )}
                  </div>
                ))}

                {error && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Live Metrics Sidebar */}
        {showMetrics && (isLoading || currentMetrics) && (
          <div className="w-80 border-l bg-muted/5 flex-shrink-0">
            <div className="p-4 h-full overflow-y-auto">
              <div className="sticky top-0">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Live Performance</h3>
                </div>
                <MetricsDisplay
                  metrics={currentMetrics || undefined}
                  model={selectedModel}
                  modelInfo={currentModelInfo}
                  isStreaming={isLoading}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              ollamaStatus?.status !== "connected"
                ? "Ollama is not connected..."
                : conversations.length === 0
                  ? "Start your first conversation..."
                  : "Type your message..."
            }
            disabled={isLoading || ollamaStatus?.status !== "connected"}
            className="flex-1"
          />
          {isLoading ? (
            <Button onClick={stopStreaming} variant="destructive" size="icon">
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={sendMessage}
              disabled={!canSendMessage}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Status messages */}
        <div className="max-w-4xl mx-auto mt-2">
          {ollamaStatus?.status !== "connected" && (
            <p className="text-center text-sm text-muted-foreground">
              {ollamaStatus?.message || "Checking Ollama connection..."}
            </p>
          )}
          {ollamaStatus?.status === "connected" &&
            models.length === 0 &&
            modelsLoaded && (
              <p className="text-center text-sm text-muted-foreground">
                No models found. Install models with: ollama pull llama2
              </p>
            )}
        </div>
      </div>
    </div>
  )
}
