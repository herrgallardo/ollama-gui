"use client"

import { useState } from "react"
import { useChatStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  MessageSquarePlus,
  Search,
  Trash2,
  X,
  MessageSquare,
  Download,
  Upload,
  Pin,
  PinOff,
  MoreVertical,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ConversationSidebar() {
  const {
    conversations,
    currentConversationId,
    showSidebar,
    selectedModel,
    createConversation,
    deleteConversation,
    setCurrentConversation,
    searchConversations,
    exportConversations,
    importConversations,
    updateConversation,
    setShowSidebar,
  } = useChatStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Filter conversations based on search
  const filteredConversations = searchQuery
    ? searchConversations(searchQuery)
    : conversations

  // Sort conversations: pinned first, then by date
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const handleNewChat = () => {
    const id = createConversation("New Chat", selectedModel)
    setCurrentConversation(id)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteConversation(id)
  }

  const handlePin = (id: string, isPinned: boolean) => {
    updateConversation(id, { isPinned: !isPinned })
  }

  const handleExport = () => {
    const data = exportConversations()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ollama-conversations-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        const success = importConversations(text)
        if (success) {
          console.log("Conversations imported successfully")
        }
      }
    }
    input.click()
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes === 0 ? "Just now" : `${minutes}m ago`
      }
      return `${hours}h ago`
    } else if (days === 1) {
      return "Yesterday"
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return d.toLocaleDateString()
    }
  }

  if (!showSidebar) return null

  return (
    <div className="w-64 h-full border-r bg-muted/5 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Conversations</h2>
          <Button
            onClick={() => setShowSidebar(false)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={handleNewChat}
          className="w-full justify-start"
          variant="outline"
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Chat
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            sortedConversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group relative flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  currentConversationId === conv.id &&
                    "bg-accent text-accent-foreground"
                )}
                onClick={() => setCurrentConversation(conv.id)}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Pin indicator */}
                {conv.isPinned && (
                  <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}

                {/* Conversation Info */}
                <div className="flex-1 truncate">
                  <p className="truncate font-medium">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv.messages.length} messages ·{" "}
                    {formatDate(conv.updatedAt)}
                  </p>
                </div>

                {/* Actions */}
                {(hoveredId === conv.id ||
                  currentConversationId === conv.id) && (
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePin(conv.id, conv.isPinned || false)
                          }}
                        >
                          {conv.isPinned ? (
                            <>
                              <PinOff className="mr-2 h-4 w-4" />
                              Unpin
                            </>
                          ) : (
                            <>
                              <Pin className="mr-2 h-4 w-4" />
                              Pin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(conv.id, e)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="border-t p-2">
        <div className="flex gap-1">
          <Button
            onClick={handleExport}
            variant="ghost"
            size="sm"
            className="flex-1 justify-start"
            title="Export all conversations"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={handleImport}
            variant="ghost"
            size="sm"
            className="flex-1 justify-start"
            title="Import conversations"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>
    </div>
  )
}
