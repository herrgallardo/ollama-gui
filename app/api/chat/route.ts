import { NextRequest } from "next/server"
import { Message, MessageMetrics } from "@/lib/types"

// Configure for streaming
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, model = "llama3.2", temperature = 0.7 } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Convert messages to Ollama format
    const ollamaMessages = messages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Make request to Ollama
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Ollama error:", error)
      return new Response(
        JSON.stringify({
          error: "Failed to connect to Ollama. Make sure Ollama is running.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Create a TransformStream to handle the streaming response
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        let metrics: MessageMetrics = {}

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // Send final metrics if available
              if (Object.keys(metrics).length > 0) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ metrics })}\n\n`)
                )
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
              break
            }

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const json = JSON.parse(line)

                  // Extract the content from Ollama's response
                  if (json.message?.content) {
                    const data = {
                      content: json.message.content,
                      done: json.done || false,
                    }

                    // Send as Server-Sent Event format
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                    )
                  }

                  // Capture metrics when the response is done
                  if (json.done) {
                    metrics = {
                      totalDuration: json.total_duration,
                      loadDuration: json.load_duration,
                      promptEvalCount: json.prompt_eval_count,
                      promptEvalDuration: json.prompt_eval_duration,
                      evalCount: json.eval_count,
                      evalDuration: json.eval_duration,
                    }

                    // Calculate tokens per second
                    if (json.eval_count && json.eval_duration) {
                      metrics.tokensPerSecond =
                        json.eval_count / (json.eval_duration / 1_000_000_000)
                    }

                    // Send metrics update
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          metrics,
                          done: true,
                        })}\n\n`
                      )
                    )
                  }
                } catch (e) {
                  // Skip invalid JSON lines
                  console.error("Failed to parse JSON:", e)
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream reading error:", error)
          controller.error(error)
        }
      },
    })

    // Return the stream with proper headers for SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
