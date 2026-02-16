/**
 * API Route: /api/settings
 *
 * CRUD operations for workflow_configs (Settings).
 * - GET: List all workflow configurations
 * - POST: Update workflow configuration (upsert)
 *
 * @module api/settings
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

// ============================================================================
// Type Definitions
// ============================================================================

/** Valid workflow types */
type WorkflowType =
  | 'test_runner'
  | 'evaluator'
  | 'personas_generator'
  | 'analyzer'
  | 'optimizer'
  | 'personas_validator'

/** Workflow configuration response */
interface WorkflowConfigResponse {
  id: string
  workflow_type: WorkflowType
  webhook_url: string
  is_active: boolean
  config: Record<string, unknown>
  last_triggered_at: string | null
  last_success_at: string | null
  total_executions: number
  created_at: string
  updated_at: string
}

/** Request body for updating a workflow config */
interface UpdateWorkflowConfigRequest {
  workflow_type: WorkflowType
  webhook_url?: string
  is_active?: boolean
  config?: Record<string, unknown>
}

// ============================================================================
// GET Handler - List Workflow Configs
// ============================================================================

/**
 * GET /api/settings
 *
 * Lists all workflow configurations.
 *
 * Query params:
 * - workflow_type: Filter by specific type (optional)
 * - active_only: Only return active configs ('true' or 'false')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const workflowType = searchParams.get('workflow_type')
    const activeOnly = searchParams.get('active_only') === 'true'

    // Build query
    let query = supabase
      .from('workflow_configs')
      .select('*')
      .order('workflow_type', { ascending: true })

    // Apply filters
    if (workflowType) {
      query = query.eq('workflow_type', workflowType)
    }
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('[settings] Error fetching configs:', error)
      return apiError('Failed to fetch settings', 'INTERNAL_ERROR', 500, error.message)
    }

    // Format response with helpful metadata
    const configs: WorkflowConfigResponse[] = data || []

    // Add status indicators
    const enrichedConfigs = configs.map((config) => ({
      ...config,
      status: {
        is_configured: !!config.webhook_url && config.webhook_url.trim() !== '',
        last_activity: config.last_triggered_at || config.last_success_at || null,
        health: getHealthStatus(config)
      }
    }))

    return apiSuccess({
      configs: enrichedConfigs,
      total: enrichedConfigs.length,
      summary: {
        configured: enrichedConfigs.filter((c) => c.status.is_configured).length,
        active: enrichedConfigs.filter((c) => c.is_active).length,
        total: enrichedConfigs.length
      }
    })

  } catch (error) {
    console.error('[settings] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

/**
 * Determines the health status of a workflow config.
 */
function getHealthStatus(config: WorkflowConfigResponse): 'healthy' | 'warning' | 'error' | 'unconfigured' {
  if (!config.webhook_url || config.webhook_url.trim() === '') {
    return 'unconfigured'
  }

  if (!config.is_active) {
    return 'warning'
  }

  // Check if last success was recent (within 24 hours)
  if (config.last_success_at) {
    const lastSuccess = new Date(config.last_success_at)
    const hoursSinceSuccess = (Date.now() - lastSuccess.getTime()) / (1000 * 60 * 60)

    if (hoursSinceSuccess > 24 && config.total_executions > 0) {
      return 'warning'
    }
  }

  return 'healthy'
}

// ============================================================================
// POST Handler - Update Workflow Config
// ============================================================================

/**
 * POST /api/settings
 *
 * Updates a workflow configuration (upsert).
 *
 * Request body:
 * - workflow_type: string (required)
 * - webhook_url: string (optional)
 * - is_active: boolean (optional)
 * - config: object (optional) - Merged with existing config
 */
export async function POST(request: NextRequest) {
  try {
    const body: UpdateWorkflowConfigRequest = await request.json()

    // Validate required fields
    if (!body.workflow_type) {
      return apiError('workflow_type is required', 'VALIDATION_ERROR', 400)
    }

    // Validate workflow_type
    const validTypes: WorkflowType[] = [
      'test_runner', 'evaluator', 'personas_generator',
      'analyzer', 'optimizer', 'personas_validator'
    ]
    if (!validTypes.includes(body.workflow_type)) {
      return apiError('Invalid workflow_type', 'VALIDATION_ERROR', 400)
    }

    // Validate webhook_url format if provided
    if (body.webhook_url && body.webhook_url.trim() !== '') {
      try {
        new URL(body.webhook_url)
      } catch {
        return apiError('Invalid webhook_url format', 'VALIDATION_ERROR', 400)
      }
    }

    // Fetch existing config
    const { data: existing } = await supabase
      .from('workflow_configs')
      .select('*')
      .eq('workflow_type', body.workflow_type)
      .single()

    // Build update data
    const updateData: Record<string, unknown> = {
      workflow_type: body.workflow_type
    }

    if (body.webhook_url !== undefined) {
      updateData.webhook_url = body.webhook_url.trim()
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }

    if (body.config !== undefined) {
      // Merge with existing config
      updateData.config = {
        ...(existing?.config || {}),
        ...body.config
      }
    }

    // Upsert
    const { data, error } = await supabase
      .from('workflow_configs')
      .upsert(updateData, { onConflict: 'workflow_type' })
      .select()
      .single()

    if (error) {
      console.error('[settings] Error updating config:', error)
      return apiError('Failed to update settings', 'INTERNAL_ERROR', 500, error.message)
    }

    console.log(`[settings] Updated ${body.workflow_type} config`)

    return apiSuccess({
      workflow_type: data.workflow_type,
      webhook_url: data.webhook_url,
      is_active: data.is_active,
      updated_at: data.updated_at
    })

  } catch (error) {
    console.error('[settings] POST error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
