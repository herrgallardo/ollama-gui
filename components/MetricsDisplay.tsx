"use client"

import { MessageMetrics, OllamaModel } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Zap,
  Clock,
  Cpu,
  Database,
  TrendingUp,
  Activity,
  Gauge,
  Timer,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricsDisplayProps {
  metrics?: MessageMetrics
  model?: string
  modelInfo?: OllamaModel
  isStreaming?: boolean
  className?: string
}

export default function MetricsDisplay({
  metrics,
  model,
  modelInfo,
  isStreaming,
  className,
}: MetricsDisplayProps) {
  if (!metrics && !isStreaming) return null

  // Calculate human-readable values
  const tokensPerSecond = metrics?.tokensPerSecond || 0
  const totalTimeMs = metrics?.totalDuration
    ? metrics.totalDuration / 1_000_000
    : 0
  const loadTimeMs = metrics?.loadDuration
    ? metrics.loadDuration / 1_000_000
    : 0
  const promptTimeMs = metrics?.promptEvalDuration
    ? metrics.promptEvalDuration / 1_000_000
    : 0
  const evalTimeMs = metrics?.evalDuration
    ? metrics.evalDuration / 1_000_000
    : 0

  // Format model size
  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)} MB`
  }

  // Get performance level
  const getPerformanceLevel = (tps: number) => {
    if (tps >= 30) return { label: "Excellent", color: "text-green-500" }
    if (tps >= 15) return { label: "Good", color: "text-blue-500" }
    if (tps >= 5) return { label: "Moderate", color: "text-yellow-500" }
    return { label: "Slow", color: "text-red-500" }
  }

  const performance = getPerformanceLevel(tokensPerSecond)

  return (
    <Card
      className={cn(
        "p-4 border-border/50 bg-background/50 backdrop-blur",
        className
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Performance Metrics</span>
          </div>
          {isStreaming && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Streaming</span>
            </div>
          )}
        </div>

        {/* Model Info */}
        {model && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Model:</span>
              <span className="font-mono font-medium">{model}</span>
            </div>
            {modelInfo && (
              <span className="text-muted-foreground">
                {formatSize(modelInfo.size)}
              </span>
            )}
          </div>
        )}

        {/* Performance Stats Grid */}
        {metrics && (
          <div className="grid grid-cols-2 gap-3">
            {/* Tokens/Second */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Speed</span>
                </div>
                <span className={cn("text-xs font-medium", performance.color)}>
                  {performance.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">
                  {tokensPerSecond.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">tok/s</span>
              </div>
              <Progress
                value={Math.min((tokensPerSecond / 50) * 100, 100)}
                className="h-1"
              />
            </div>

            {/* Total Time */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Total Time
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">
                  {totalTimeMs > 1000
                    ? `${(totalTimeMs / 1000).toFixed(1)}`
                    : totalTimeMs.toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {totalTimeMs > 1000 ? "s" : "ms"}
                </span>
              </div>
              <Progress
                value={Math.min((totalTimeMs / 10000) * 100, 100)}
                className="h-1"
              />
            </div>

            {/* Tokens Generated */}
            {metrics.evalCount && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tokens</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">{metrics.evalCount}</span>
                  <span className="text-xs text-muted-foreground">
                    generated
                  </span>
                </div>
              </div>
            )}

            {/* Prompt Tokens */}
            {metrics.promptEvalCount && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Context</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">
                    {metrics.promptEvalCount}
                  </span>
                  <span className="text-xs text-muted-foreground">tokens</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timing Breakdown */}
        {metrics && (loadTimeMs > 0 || promptTimeMs > 0 || evalTimeMs > 0) && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground font-medium">
              Timing Breakdown
            </div>
            <div className="space-y-1.5">
              {loadTimeMs > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Load:</span>
                  </div>
                  <span className="font-mono">{loadTimeMs.toFixed(0)}ms</span>
                </div>
              )}
              {promptTimeMs > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Prompt:</span>
                  </div>
                  <span className="font-mono">{promptTimeMs.toFixed(0)}ms</span>
                </div>
              )}
              {evalTimeMs > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Generation:</span>
                  </div>
                  <span className="font-mono">{evalTimeMs.toFixed(0)}ms</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isStreaming && !metrics && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
