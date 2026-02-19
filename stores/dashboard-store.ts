import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DashboardState {
  dateRange: [Date, Date]
  selectedConversations: string[]

  setDateRange: (range: [Date, Date]) => void
  toggleConversationSelection: (id: string) => void
  clearConversationSelections: () => void
  resetFilters: () => void
}

// Default date range: last 30 days
const getDefaultDateRange = (): [Date, Date] => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return [start, end]
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      dateRange: getDefaultDateRange(),
      selectedConversations: [],

      setDateRange: (range) => set({ dateRange: range }),

      toggleConversationSelection: (id) =>
        set((state) => {
          const isSelected = state.selectedConversations.includes(id)
          const MAX_SELECTIONS = 4

          if (isSelected) {
            return { selectedConversations: state.selectedConversations.filter((convId) => convId !== id) }
          } else {
            if (state.selectedConversations.length >= MAX_SELECTIONS) {
              return { selectedConversations: [...state.selectedConversations.slice(1), id] }
            }
            return { selectedConversations: [...state.selectedConversations, id] }
          }
        }),

      clearConversationSelections: () => set({ selectedConversations: [] }),

      resetFilters: () => set({
        dateRange: getDefaultDateRange(),
        selectedConversations: [],
      }),
    }),
    {
      name: 'dashboard-storage',
      // Only persist dateRange — selectedConversations is ephemeral
      partialize: (state) => ({
        dateRange: state.dateRange,
      }),
    }
  )
)
