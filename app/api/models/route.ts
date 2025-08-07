import { NextResponse } from "next/server"
import { OllamaModelsResponse } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Fetch models from Ollama
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Don't cache this request
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("Failed to fetch models from Ollama:", response.status)
      return NextResponse.json(
        {
          error: "Failed to fetch models from Ollama",
          details: "Make sure Ollama is running on http://localhost:11434",
        },
        { status: 500 }
      )
    }

    const data: OllamaModelsResponse = await response.json()

    // Return the models in a clean format
    const models = data.models.map((model) => ({
      name: model.name,
      model: model.model,
      size: model.size,
      modified_at: model.modified_at,
      details: model.details,
    }))

    // Sort models by name for better UX
    models.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      models,
      count: models.length,
    })
  } catch (error) {
    console.error("Models API error:", error)

    // Check if it's a connection error
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        {
          error: "Cannot connect to Ollama",
          details:
            "Please ensure Ollama is running. Start it with: ollama serve",
          models: [],
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        models: [],
      },
      { status: 500 }
    )
  }
}
