"use client"

import { useChatStore } from "@/lib/store"
import Chat from "@/components/Chat"
import ConversationSidebar from "@/components/ConversationSidebar"
import { cn } from "@/lib/utils"

export default function ChatLayout() {
  const { showSidebar } = useChatStore()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - responsive */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-background md:relative md:z-0",
          "transition-transform duration-200 ease-in-out",
          showSidebar ? "translate-x-0" : "-translate-x-full md:hidden"
        )}
      >
        <ConversationSidebar />
      </div>

      {/* Overlay for mobile */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => useChatStore.getState().setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Chat />
      </div>
    </div>
  )
}
