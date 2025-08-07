"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Message, OllamaModel } from "@/lib/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Send, StopCircle, Bot, User } from "lucide-react"

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [models, setModels] = useState<OllamaModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Fetch available models on mount
  useEffect(() => {
    fetchModels()
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/models")
      if (!response.ok) {
        throw new Error("Failed to fetch models")
      }
      const data = await response.json()
      setModels(data.models || [])

      // Set default model if available
      if (data.models && data.models.length > 0) {
        setSelectedModel(data.models[0].name)
      }
    } catch (error) {
      console.error("Error fetching models:", error)
      setError("Failed to fetch models. Make sure Ollama is running.")
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !selectedModel) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    // Add user message and create placeholder for assistant
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
      model: selectedModel,
    }

    setMessages((prev) => [...prev, assistantMessage])

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

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)

            if (data === "[DONE]") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, isStreaming: false }
                    : m
                )
              )
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: fullContent }
                      : m
                  )
                )
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
        } else {
          console.error("Error sending message:", error)
          setError(error.message || "Failed to send message")

          // Remove the empty assistant message on error
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantMessage.id)
          )
        }
      } else {
        console.error("Error sending message:", error)
        setError("Failed to send message")

        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)

      // Mark the last message as no longer streaming
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, isStreaming: false } : m
        )
      )
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Ollama Chat</h1>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[200px]">
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4" ref={scrollAreaRef}>
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation by sending a message below</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${
                  message.role === "assistant" ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
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
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {error && (
            <div className="text-center text-destructive py-2">
              <p>{error}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading || !selectedModel}
            className="flex-1"
          />
          {isLoading ? (
            <Button onClick={stopStreaming} variant="destructive" size="icon">
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || !selectedModel}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        {!selectedModel && models.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            No models found. Make sure Ollama is running and has models
            installed.
          </p>
        )}
      </div>
    </div>
  )
}
