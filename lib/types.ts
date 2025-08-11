/**
 * Represents a chat message between the user and the AI
 */
export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isStreaming?: boolean
  model?: string
  metrics?: MessageMetrics
}

/**
 * Performance metrics for a message
 */
export interface MessageMetrics {
  totalDuration?: number // Total time in nanoseconds
  loadDuration?: number // Model loading time
  promptEvalCount?: number // Number of tokens in prompt
  promptEvalDuration?: number // Time spent evaluating prompt
  evalCount?: number // Number of tokens generated
  evalDuration?: number // Time spent generating
  tokensPerSecond?: number // Calculated tokens/second
}

/**
 * Represents a conversation/chat session
 */
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: string
  createdAt: Date
  updatedAt: Date
  isPinned?: boolean
  tags?: string[]
}

/**
 * Represents an Ollama model from the API
 */
export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parent_model: string
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

/**
 * Response from Ollama's /api/tags endpoint
 */
export interface OllamaModelsResponse {
  models: OllamaModel[]
}

/**
 * Request body for chat completion
 */
export interface ChatRequest {
  model: string
  messages: Message[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

/**
 * Streaming response chunk from Ollama
 */
export interface StreamingResponse {
  model: string
  created_at: string
  message?: {
    role: string
    content: string
  }
  done: boolean
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

/**
 * Application settings
 */
export interface Settings {
  defaultModel: string
  temperature: number
  maxTokens: number
  theme: "light" | "dark" | "system"
  streamingEnabled: boolean
  showMetrics: boolean
  autoSaveInterval: number // Auto-save every X seconds
  conversationView: "list" | "grid" // How to display conversations
}

/**
 * System resource information
 */
export interface SystemResources {
  cpuUsage?: number
  memoryUsage?: number
  modelSize?: string
  quantization?: string
}

/**
 * Export format for conversations
 */
export interface ExportData {
  version: string
  exportDate: Date
  conversations: Conversation[]
  settings?: Partial<Settings>
}
