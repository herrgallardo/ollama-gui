"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { OllamaStatus } from "@/app/api/ollama/status/route"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Terminal,
  Download,
  Loader2,
} from "lucide-react"

interface OllamaStatusProps {
  onStatusChange?: (status: OllamaStatus) => void
  className?: string
  compact?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function OllamaStatusIndicator({
  onStatusChange,
  className,
  compact = false,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}: OllamaStatusProps) {
  const [status, setStatus] = useState<OllamaStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ollama/status", {
        cache: "no-store",
      })
      const statusData: OllamaStatus = await response.json()
      setStatus(statusData)
      setLastChecked(new Date())
      onStatusChange?.(statusData)
    } catch (error) {
      console.error("Failed to check Ollama status:", error)
      const errorStatus: OllamaStatus = {
        status: "error",
        message: "Failed to check status",
        details: "Network error or API unavailable",
      }
      setStatus(errorStatus)
      onStatusChange?.(errorStatus)
    } finally {
      setIsLoading(false)
    }
  }, [onStatusChange])

  // Initial check and auto-refresh
  useEffect(() => {
    checkStatus()

    if (autoRefresh) {
      const interval = setInterval(checkStatus, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [checkStatus, autoRefresh, refreshInterval])

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />
    }

    switch (status?.status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "not_running":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case "not_installed":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (status?.status) {
      case "connected":
        return "text-green-600 dark:text-green-400"
      case "not_running":
        return "text-yellow-600 dark:text-yellow-400"
      case "not_installed":
      case "error":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  const formatLastChecked = () => {
    if (!lastChecked) return "Never"
    const now = new Date()
    const diff = now.getTime() - lastChecked.getTime()
    const seconds = Math.floor(diff / 1000)

    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return lastChecked.toLocaleTimeString()
  }

  const getActionItems = () => {
    const items = []

    switch (status?.status) {
      case "not_installed":
        items.push(
          <DropdownMenuItem key="install" asChild>
            <a
              href="https://ollama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Ollama
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </DropdownMenuItem>
        )
        break
      case "not_running":
        items.push(
          <DropdownMenuItem key="start" asChild>
            <a
              href="https://github.com/ollama/ollama#quickstart"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Terminal className="mr-2 h-4 w-4" />
              Start Ollama Guide
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </DropdownMenuItem>
        )
        break
    }

    return items
  }

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", className)}
            title={status?.message || "Check Ollama status"}
          >
            {getStatusIcon()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <span className="font-medium">Ollama Status</span>
            </div>
            <div className={cn("text-sm", getStatusColor())}>
              {status?.message || "Checking..."}
            </div>
            {status?.details && (
              <div className="text-xs text-muted-foreground mt-1">
                {status.details}
              </div>
            )}
            {status?.version && (
              <div className="text-xs text-muted-foreground mt-1">
                Version: {status.version}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              Last checked: {formatLastChecked()}
            </div>
          </div>

          {getActionItems().length > 0 && (
            <>
              <DropdownMenuSeparator />
              {getActionItems()}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={checkStatus} disabled={isLoading}>
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh Status
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <div className={cn("font-medium", getStatusColor())}>
                {status?.message || "Checking Ollama status..."}
              </div>
              {status?.details && (
                <div className="text-xs text-muted-foreground">
                  {status.details}
                </div>
              )}
              {status?.version && (
                <div className="text-xs text-muted-foreground">
                  Version: {status.version}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getActionItems().length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Help
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {getActionItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              onClick={checkStatus}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          Last checked: {formatLastChecked()}
        </div>
      </CardContent>
    </Card>
  )
}
