/**
 * API Route: /api/criteria-definitions
 *
 * Read-only endpoint for the criteria catalog.
 * Used by the UI criteria editor to fetch available criteria.
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, createSupabaseClient } from '@/lib/api-response'

const supabase = createSupabaseClient()

/**
 * GET /api/criteria-definitions
 *
 * Query params:
 * - category: 'core' | 'domain' (optional)
 * - domain_type: e.g. 'outbound_sales' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const domainType = searchParams.get('domain_type')

    let query = supabase
      .from('criteria_definitions')
      .select('id, name, description, scoring_guide, category, domain_type, weight_default')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }
    if (domainType) {
      query = query.eq('domain_type', domainType)
    }

    const { data, error } = await query

    if (error) {
      console.error('[criteria-definitions] Error:', error)
      return apiError('Failed to fetch criteria definitions', 'INTERNAL_ERROR', 500)
    }

    return apiSuccess(data)
  } catch (error) {
    console.error('[criteria-definitions] Unexpected error:', error)
    return apiError('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
