import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { Message } from "./types"

interface ChatStore {
  // State
  messages: Message[]
  selectedModel: string
  isLoading: boolean
  error: string | null
  hasHydrated: boolean

  // Actions
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  clearMessages: () => void
  setSelectedModel: (model: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setHasHydrated: (hydrated: boolean) => void

  // Helper to get the last message
  getLastMessage: () => Message | undefined
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      selectedModel: "",
      isLoading: false,
      error: null,
      hasHydrated: false,

      // Actions
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
          error: null, // Clear error when new message is added
        })),

      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),

      clearMessages: () =>
        set({
          messages: [],
          error: null,
        }),

      setSelectedModel: (model) => set({ selectedModel: model }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      getLastMessage: () => {
        const state = get()
        return state.messages[state.messages.length - 1]
      },
    }),
    {
      name: "ollama-chat-storage", // unique name for localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        messages: state.messages,
        selectedModel: state.selectedModel,
      }),
      onRehydrateStorage: () => (state) => {
        // This runs after hydration
        state?.setHasHydrated(true)
      },
    }
  )
)
