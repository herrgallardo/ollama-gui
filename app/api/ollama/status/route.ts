import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export interface OllamaStatus {
  status: "connected" | "not_running" | "not_installed" | "error"
  version?: string
  message: string
  details?: string
}

export async function GET() {
  try {
    // Try to fetch the version endpoint first (lighter than /api/tags)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch("http://localhost:11434/api/version", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({
        status: "error",
        message: "Ollama API returned an error",
        details: `HTTP ${response.status}: ${response.statusText}`,
      } as OllamaStatus)
    }

    const versionData = await response.json()

    // If version endpoint works, also check if we can list models
    try {
      const modelsResponse = await fetch("http://localhost:11434/api/tags", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout for models check
        cache: "no-store",
      })

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        const modelCount = modelsData.models?.length || 0

        return NextResponse.json({
          status: "connected",
          version: versionData.version,
          message: `Connected to Ollama v${versionData.version}`,
          details: `${modelCount} model${modelCount !== 1 ? "s" : ""} available`,
        } as OllamaStatus)
      } else {
        return NextResponse.json({
          status: "error",
          version: versionData.version,
          message: "Ollama is running but models endpoint failed",
          details: "Try restarting Ollama",
        } as OllamaStatus)
      }
    } catch {
      // Version works but models doesn't - still consider it connected
      return NextResponse.json({
        status: "connected",
        version: versionData.version,
        message: `Connected to Ollama v${versionData.version}`,
        details: "Models endpoint unavailable",
      } as OllamaStatus)
    }
  } catch (error) {
    console.error("Ollama status check error:", error)

    // Check specific error types
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json({
          status: "not_running",
          message: "Ollama is not responding",
          details: "Connection timed out. Make sure Ollama is running.",
        } as OllamaStatus)
      }

      if (error.message.includes("ECONNREFUSED")) {
        return NextResponse.json({
          status: "not_running",
          message: "Ollama is not running",
          details: "Start Ollama with: ollama serve",
        } as OllamaStatus)
      }

      if (
        error.message.includes("ENOTFOUND") ||
        error.message.includes("EAI_AGAIN")
      ) {
        return NextResponse.json({
          status: "not_installed",
          message: "Ollama may not be installed",
          details: "Install Ollama from https://ollama.ai",
        } as OllamaStatus)
      }

      if (error.message.includes("fetch")) {
        return NextResponse.json({
          status: "not_running",
          message: "Cannot connect to Ollama",
          details: "Ensure Ollama is running on localhost:11434",
        } as OllamaStatus)
      }
    }

    // Generic error fallback
    return NextResponse.json({
      status: "error",
      message: "Failed to check Ollama status",
      details: error instanceof Error ? error.message : "Unknown error",
    } as OllamaStatus)
  }
}
