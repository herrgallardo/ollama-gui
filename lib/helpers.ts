/**
 * Utility functions for the Ollama Chat application
 */

// Counter for ensuring unique IDs even when called rapidly
let idCounter = 0

/**
 * Generate a unique ID for messages and conversations
 * Combines timestamp with a counter to prevent collisions
 */
export function generateUniqueId(): string {
  const timestamp = Date.now()
  const counter = idCounter++

  // Reset counter every million to prevent overflow
  if (idCounter >= 1000000) {
    idCounter = 0
  }

  return `${timestamp}-${counter}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounce function to prevent rapid successive calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Safely abort an AbortController
 */
export function safeAbort(controller: AbortController | null): void {
  if (controller && !controller.signal.aborted) {
    controller.abort()
  }
}

/**
 * Create a timeout promise for race conditions
 */
export function createTimeout(
  ms: number,
  message = "Operation timed out"
): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms)
  })
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Format duration from nanoseconds to human readable
 */
export function formatDuration(nanoseconds: number): string {
  const milliseconds = nanoseconds / 1_000_000

  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(0)}ms`
  }

  const seconds = milliseconds / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }

  const minutes = seconds / 60
  return `${minutes.toFixed(1)}m`
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Max retries exceeded")
}
