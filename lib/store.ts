import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { Message, MessageMetrics, Conversation } from "./types"
import { generateUniqueId } from "./helpers"

interface ChatStore {
  // Conversations
  conversations: Conversation[]
  currentConversationId: string | null

  // UI State
  selectedModel: string
  isLoading: boolean
  error: string | null
  hasHydrated: boolean
  showMetrics: boolean
  currentMetrics: MessageMetrics | null
  showSidebar: boolean
  isSending: boolean // Added to prevent concurrent sends

  // Conversation Actions
  createConversation: (title?: string, model?: string) => string
  deleteConversation: (id: string) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  setCurrentConversation: (id: string | null) => void
  getCurrentConversation: () => Conversation | undefined

  // Message Actions (for current conversation)
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  clearCurrentMessages: () => void

  // Search
  searchConversations: (query: string) => Conversation[]

  // UI Actions
  setSelectedModel: (model: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setHasHydrated: (hydrated: boolean) => void
  setShowMetrics: (show: boolean) => void
  setCurrentMetrics: (metrics: MessageMetrics | null) => void
  setShowSidebar: (show: boolean) => void
  setIsSending: (sending: boolean) => void

  // Import/Export
  exportConversations: () => string
  importConversations: (data: string) => boolean

  // Utility
  generateTitle: (firstMessage: string) => string
  getConversationStats: () => {
    totalConversations: number
    totalMessages: number
    mostUsedModel: string
  }
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      currentConversationId: null,
      selectedModel: "",
      isLoading: false,
      error: null,
      hasHydrated: false,
      showMetrics: true,
      currentMetrics: null,
      showSidebar: true,
      isSending: false,

      // Conversation Actions
      createConversation: (title, model) => {
        const id = generateUniqueId() // Use the better ID generator
        const newConversation: Conversation = {
          id,
          title: title || "New Chat",
          messages: [],
          model: model || get().selectedModel || "llama3.2",
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
          error: null,
        }))

        return id
      },

      deleteConversation: (id) => {
        set((state) => {
          const newConversations = state.conversations.filter(
            (c) => c.id !== id
          )
          const newCurrentId =
            state.currentConversationId === id
              ? newConversations[0]?.id || null
              : state.currentConversationId

          return {
            conversations: newConversations,
            currentConversationId: newCurrentId,
          }
        })
      },

      updateConversation: (id, updates) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id
              ? { ...conv, ...updates, updatedAt: new Date() }
              : conv
          ),
        }))
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id })
      },

      getCurrentConversation: () => {
        const state = get()
        return state.conversations.find(
          (c) => c.id === state.currentConversationId
        )
      },

      // Message Actions
      addMessage: (message) => {
        const state = get()
        const currentConv = state.getCurrentConversation()

        if (!currentConv) {
          // Create new conversation if none exists
          const id = state.createConversation(
            state.generateTitle(message.content),
            state.selectedModel
          )
          // Use setTimeout to ensure state is updated before adding message
          setTimeout(() => {
            set((state) => ({
              conversations: state.conversations.map((conv) =>
                conv.id === id
                  ? {
                      ...conv,
                      messages: [...conv.messages, message],
                      updatedAt: new Date(),
                    }
                  : conv
              ),
            }))
          }, 0)
        } else {
          // Add to existing conversation
          state.updateConversation(currentConv.id, {
            messages: [...currentConv.messages, message],
          })

          // Auto-update title if it's still "New Chat" and this is the first user message
          if (
            currentConv.title === "New Chat" &&
            message.role === "user" &&
            currentConv.messages.length === 0
          ) {
            state.updateConversation(currentConv.id, {
              title: state.generateTitle(message.content),
            })
          }
        }

        set({ error: null })
      },

      updateMessage: (id, updates) => {
        const state = get()
        const currentConv = state.getCurrentConversation()

        if (currentConv) {
          const updatedMessages = currentConv.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          )

          state.updateConversation(currentConv.id, {
            messages: updatedMessages,
          })
        }
      },

      clearCurrentMessages: () => {
        const state = get()
        const currentConv = state.getCurrentConversation()

        if (currentConv) {
          state.updateConversation(currentConv.id, {
            messages: [],
          })
        }

        set({ error: null, currentMetrics: null, isSending: false })
      },

      // Search
      searchConversations: (query) => {
        const state = get()
        const lowercaseQuery = query.toLowerCase()

        return state.conversations.filter((conv) => {
          // Search in title
          if (conv.title.toLowerCase().includes(lowercaseQuery)) return true

          // Search in messages
          return conv.messages.some((msg) =>
            msg.content.toLowerCase().includes(lowercaseQuery)
          )
        })
      },

      // UI Actions
      setSelectedModel: (model) => set({ selectedModel: model }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      setShowMetrics: (show) => set({ showMetrics: show }),
      setCurrentMetrics: (metrics) => set({ currentMetrics: metrics }),
      setShowSidebar: (show) => set({ showSidebar: show }),
      setIsSending: (sending) => set({ isSending: sending }),

      // Import/Export
      exportConversations: () => {
        const state = get()
        const exportData = {
          version: "1.0",
          exportDate: new Date().toISOString(),
          conversations: state.conversations,
          settings: {
            selectedModel: state.selectedModel,
            showMetrics: state.showMetrics,
          },
        }
        return JSON.stringify(exportData, null, 2)
      },

      importConversations: (data) => {
        try {
          const parsed = JSON.parse(data)

          // Validate structure
          if (!parsed.conversations || !Array.isArray(parsed.conversations)) {
            throw new Error("Invalid import format")
          }

          // Regenerate IDs to prevent collisions
          const conversationsWithNewIds = parsed.conversations.map(
            (conv: Conversation) => ({
              ...conv,
              id: generateUniqueId(),
              messages: conv.messages.map((msg: Message) => ({
                ...msg,
                id: generateUniqueId(),
              })),
            })
          )

          // Merge with existing conversations
          set((state) => ({
            conversations: [...conversationsWithNewIds, ...state.conversations],
          }))

          // Optionally import settings
          if (parsed.settings) {
            if (parsed.settings.selectedModel) {
              set({ selectedModel: parsed.settings.selectedModel })
            }
            if (typeof parsed.settings.showMetrics === "boolean") {
              set({ showMetrics: parsed.settings.showMetrics })
            }
          }

          return true
        } catch (error) {
          console.error("Import failed:", error)
          set({ error: "Failed to import conversations" })
          return false
        }
      },

      // Utility
      generateTitle: (firstMessage) => {
        // Take first 50 characters of the message
        const truncated = firstMessage.slice(0, 50)
        return truncated.length < firstMessage.length
          ? truncated + "..."
          : truncated
      },

      getConversationStats: () => {
        const state = get()
        const totalMessages = state.conversations.reduce(
          (sum, conv) => sum + conv.messages.length,
          0
        )

        // Count model usage
        const modelCounts: Record<string, number> = {}
        state.conversations.forEach((conv) => {
          modelCounts[conv.model] = (modelCounts[conv.model] || 0) + 1
        })

        const mostUsedModel =
          Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          "none"

        return {
          totalConversations: state.conversations.length,
          totalMessages,
          mostUsedModel,
        }
      },
    }),
    {
      name: "ollama-chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        selectedModel: state.selectedModel,
        showMetrics: state.showMetrics,
        showSidebar: state.showSidebar,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
