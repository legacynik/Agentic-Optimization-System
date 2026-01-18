import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DashboardState {
  // Filters
  dateRange: [Date, Date]
  selectedPersona: string | null
  selectedOutcomes: string[]
  scoreRange: [number, number]
  showBookedOnly: boolean

  // Selected conversations (for compare)
  selectedConversations: string[]

  // Actions
  setDateRange: (range: [Date, Date]) => void
  setSelectedPersona: (persona: string | null) => void
  toggleOutcome: (outcome: string) => void
  setScoreRange: (range: [number, number]) => void
  toggleShowBooked: () => void
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
    (set, get) => ({
      // Initial state
      dateRange: getDefaultDateRange(),
      selectedPersona: null,
      selectedOutcomes: [],
      scoreRange: [0, 10],
      showBookedOnly: false,
      selectedConversations: [],

      // Actions
      setDateRange: (range) => set({ dateRange: range }),

      setSelectedPersona: (persona) => set({ selectedPersona: persona }),

      toggleOutcome: (outcome) =>
        set((state) => {
          const outcomes = state.selectedOutcomes.includes(outcome)
            ? state.selectedOutcomes.filter((o) => o !== outcome)
            : [...state.selectedOutcomes, outcome]
          return { selectedOutcomes: outcomes }
        }),

      setScoreRange: (range) => set({ scoreRange: range }),

      toggleShowBooked: () => set((state) => ({ showBookedOnly: !state.showBookedOnly })),

      toggleConversationSelection: (id) =>
        set((state) => {
          const isSelected = state.selectedConversations.includes(id)
          const MAX_SELECTIONS = 4

          if (isSelected) {
            // Remove from selection
            return {
              selectedConversations: state.selectedConversations.filter((convId) => convId !== id),
            }
          } else {
            // Add to selection (max 4)
            if (state.selectedConversations.length >= MAX_SELECTIONS) {
              // Remove oldest and add new
              const newSelections = [...state.selectedConversations.slice(1), id]
              return { selectedConversations: newSelections }
            }
            return {
              selectedConversations: [...state.selectedConversations, id],
            }
          }
        }),

      clearConversationSelections: () => set({ selectedConversations: [] }),

      resetFilters: () =>
        set({
          dateRange: getDefaultDateRange(),
          selectedPersona: null,
          selectedOutcomes: [],
          scoreRange: [0, 10],
          showBookedOnly: false,
        }),
    }),
    {
      name: 'dashboard-storage', // localStorage key
      partialize: (state) => ({
        // Only persist filters, not selections
        dateRange: state.dateRange,
        selectedPersona: state.selectedPersona,
        selectedOutcomes: state.selectedOutcomes,
        scoreRange: state.scoreRange,
        showBookedOnly: state.showBookedOnly,
      }),
    }
  )
)
