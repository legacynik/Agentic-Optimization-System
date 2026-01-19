/**
 * Tool Mock Scenarios (v2.4 Hardcoded)
 *
 * Per PRD v2.4 Lean, tool mock scenarios are hardcoded instead of stored in DB.
 * This simplifies the MVP while maintaining flexibility for testing.
 *
 * These scenarios define how tools should respond during battle tests,
 * allowing controlled testing of different edge cases.
 *
 * @module lib/tool-scenarios
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** Available tool scenario IDs (v2.4: hardcoded set) */
export type ToolScenarioId =
  | 'happy_path'
  | 'calendar_full'
  | 'booking_fails'
  | 'partial_availability'

/** Response structure for a mocked tool */
export interface ToolMockResponse {
  /** Whether the tool call succeeded */
  success: boolean
  /** Response data if successful */
  response?: Record<string, unknown>
  /** Error code if failed */
  error?: string
  /** Human-readable error message */
  message?: string
}

/** Tool scenario definition */
export interface ToolScenario {
  /** Unique identifier */
  id: ToolScenarioId
  /** Display name */
  name: string
  /** Description of what this scenario tests */
  description: string
  /** Detailed description for UI tooltips */
  detailedDescription?: string
  /** Mock responses for each tool */
  mocks: Record<string, ToolMockResponse>
  /** Tags for filtering */
  tags?: string[]
}

// ============================================================================
// Hardcoded Scenarios
// ============================================================================

/**
 * All available tool mock scenarios.
 *
 * Each scenario defines how tools respond, enabling testing of:
 * - Happy paths (everything works)
 * - Error handling (tools fail)
 * - Edge cases (partial availability, returning customers, etc.)
 */
export const TOOL_SCENARIOS: Record<ToolScenarioId, ToolScenario> = {
  /**
   * Happy Path Scenario
   * All tools work correctly, calendar has availability.
   * Use for baseline testing and verifying correct behavior.
   */
  happy_path: {
    id: 'happy_path',
    name: 'Happy Path',
    description: 'Tutti i tool funzionano, slot disponibili',
    detailedDescription:
      'Scenario ideale dove tutti i tool rispondono correttamente. ' +
      'Il calendario ha slot disponibili, la prenotazione va a buon fine, ' +
      'e il cliente è nuovo. Usare per test di base.',
    tags: ['baseline', 'positive'],
    mocks: {
      check_calendar: {
        success: true,
        response: {
          available_slots: ['10:00', '14:00', '16:00'],
          next_available_day: 'today',
          timezone: 'Europe/Rome'
        }
      },
      book_appointment: {
        success: true,
        response: {
          confirmation_code: 'CONF-{{random}}',
          status: 'confirmed',
          date: new Date().toISOString().split('T')[0],
          slot: '{{selected_slot}}'
        }
      },
      get_customer_info: {
        success: true,
        response: {
          name: 'Mario Rossi',
          is_new: true,
          phone: '+39 333 1234567',
          email: 'mario.rossi@example.com'
        }
      },
      send_confirmation: {
        success: true,
        response: {
          sent: true,
          channel: 'sms',
          message_id: 'MSG-{{random}}'
        }
      }
    }
  },

  /**
   * Calendar Full Scenario
   * Calendar has no availability. Tests how agent handles "no slots" gracefully.
   */
  calendar_full: {
    id: 'calendar_full',
    name: 'Calendario Pieno',
    description: 'Nessuno slot disponibile',
    detailedDescription:
      'Il calendario non ha disponibilità per i prossimi giorni. ' +
      'Testa come l\'agente comunica la mancanza di disponibilità ' +
      'e propone alternative (waitlist, callback, etc.).',
    tags: ['edge-case', 'negative', 'availability'],
    mocks: {
      check_calendar: {
        success: true,
        response: {
          available_slots: [],
          next_available_day: null,
          message: 'Nessuno slot disponibile nei prossimi 7 giorni'
        }
      },
      book_appointment: {
        success: false,
        error: 'no_slots_available',
        message: 'Impossibile prenotare: nessuno slot disponibile'
      },
      get_customer_info: {
        success: true,
        response: {
          name: 'Cliente Test',
          is_new: true
        }
      },
      add_to_waitlist: {
        success: true,
        response: {
          position: 3,
          estimated_wait: '2-3 giorni'
        }
      }
    }
  },

  /**
   * Booking Fails Scenario
   * Calendar shows availability but booking fails. Tests error handling.
   */
  booking_fails: {
    id: 'booking_fails',
    name: 'Prenotazione Fallisce',
    description: 'Calendario ok ma booking fallisce',
    detailedDescription:
      'Il calendario mostra disponibilità, ma quando si tenta di prenotare ' +
      'il sistema restituisce un errore. Testa la gestione degli errori ' +
      'e il recovery (es. proporre slot alternativo, riprovare).',
    tags: ['error-handling', 'negative', 'booking'],
    mocks: {
      check_calendar: {
        success: true,
        response: {
          available_slots: ['10:00', '14:00'],
          next_available_day: 'today'
        }
      },
      book_appointment: {
        success: false,
        error: 'system_error',
        message: 'Errore temporaneo del sistema di prenotazione. Riprovare tra qualche minuto.'
      },
      get_customer_info: {
        success: true,
        response: {
          name: 'Cliente Test',
          is_new: true
        }
      },
      check_booking_status: {
        success: true,
        response: {
          system_status: 'degraded',
          estimated_recovery: '5 minuti'
        }
      }
    }
  },

  /**
   * Partial Availability Scenario
   * Limited slots available, returning customer with preferences.
   * Tests personalization and handling of constraints.
   */
  partial_availability: {
    id: 'partial_availability',
    name: 'Disponibilità Parziale',
    description: 'Pochi slot, cliente abituale con preferenze',
    detailedDescription:
      'Solo uno slot disponibile, e il cliente è già noto con preferenze salvate. ' +
      'Testa la personalizzazione della conversazione e la gestione di vincoli ' +
      '(es. cliente preferisce mattina ma unico slot è pomeriggio).',
    tags: ['edge-case', 'personalization', 'returning-customer'],
    mocks: {
      check_calendar: {
        success: true,
        response: {
          available_slots: ['16:30'],
          next_available_day: 'today',
          note: 'Ultimo slot disponibile per oggi'
        }
      },
      book_appointment: {
        success: true,
        response: {
          confirmation_code: 'CONF-{{random}}',
          status: 'confirmed',
          slot: '16:30',
          note: 'Cliente abituale - priorità confermata'
        }
      },
      get_customer_info: {
        success: true,
        response: {
          name: 'Giuseppe Verdi',
          is_new: false,
          last_visit: '2024-01-15',
          notes: 'Preferisce mattina. Allergie: nessuna.',
          loyalty_points: 150,
          preferred_times: ['09:00', '10:00', '11:00']
        }
      },
      check_waitlist: {
        success: true,
        response: {
          position: null,
          message: 'Cliente non in waitlist'
        }
      }
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Default scenario to use when none specified */
export const DEFAULT_SCENARIO: ToolScenarioId = 'happy_path'

/**
 * Gets a scenario by ID, falling back to default if not found.
 *
 * @param id - Scenario ID to look up
 * @returns The scenario configuration
 */
export function getScenario(id: ToolScenarioId | string | undefined): ToolScenario {
  if (!id || !TOOL_SCENARIOS[id as ToolScenarioId]) {
    return TOOL_SCENARIOS[DEFAULT_SCENARIO]
  }
  return TOOL_SCENARIOS[id as ToolScenarioId]
}

/**
 * Gets all scenarios as options for UI dropdowns.
 *
 * @returns Array of { value, label, description } objects
 */
export function getScenarioOptions(): Array<{
  value: ToolScenarioId
  label: string
  description: string
}> {
  return Object.values(TOOL_SCENARIOS).map((s) => ({
    value: s.id,
    label: s.name,
    description: s.description
  }))
}

/**
 * Gets scenarios filtered by tag.
 *
 * @param tag - Tag to filter by
 * @returns Array of matching scenarios
 */
export function getScenariosByTag(tag: string): ToolScenario[] {
  return Object.values(TOOL_SCENARIOS).filter((s) => s.tags?.includes(tag))
}

/**
 * Validates if a string is a valid scenario ID.
 *
 * @param id - String to validate
 * @returns true if valid scenario ID
 */
export function isValidScenarioId(id: string): id is ToolScenarioId {
  return id in TOOL_SCENARIOS
}

/**
 * Merges base scenario mocks with overrides.
 * Used when test configuration includes inline tool_mocks_override.
 *
 * @param scenarioId - Base scenario ID
 * @param overrides - Tool-specific overrides
 * @returns Merged mock configuration
 */
export function mergeScenarioWithOverrides(
  scenarioId: ToolScenarioId | string | undefined,
  overrides?: Record<string, Partial<ToolMockResponse>>
): Record<string, ToolMockResponse> {
  const baseScenario = getScenario(scenarioId)
  const baseMocks = { ...baseScenario.mocks }

  if (!overrides) {
    return baseMocks
  }

  // Deep merge overrides into base mocks
  for (const [toolName, override] of Object.entries(overrides)) {
    if (baseMocks[toolName]) {
      baseMocks[toolName] = {
        ...baseMocks[toolName],
        ...override,
        response: override.response
          ? { ...(baseMocks[toolName].response || {}), ...override.response }
          : baseMocks[toolName].response
      }
    } else {
      // Add new tool mock from override
      baseMocks[toolName] = override as ToolMockResponse
    }
  }

  return baseMocks
}

/**
 * Processes dynamic placeholders in mock responses.
 * Supported placeholders:
 * - {{random}} - Random alphanumeric string
 * - {{selected_slot}} - From session state
 * - {{date}} - Current date ISO format
 *
 * @param response - Response object with potential placeholders
 * @param sessionState - Current session state for context
 * @returns Processed response with placeholders replaced
 */
export function processMockResponse(
  response: Record<string, unknown>,
  sessionState?: Record<string, unknown>
): Record<string, unknown> {
  let jsonStr = JSON.stringify(response)

  // Replace placeholders
  jsonStr = jsonStr.replace(/\{\{random\}\}/g, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  )

  jsonStr = jsonStr.replace(/\{\{selected_slot\}\}/g, () =>
    (sessionState?.selected_slot as string) || 'N/A'
  )

  jsonStr = jsonStr.replace(/\{\{date\}\}/g, () =>
    new Date().toISOString().split('T')[0]
  )

  return JSON.parse(jsonStr)
}
