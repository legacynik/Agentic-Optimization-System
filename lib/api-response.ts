/**
 * Standardized API response helpers
 *
 * All API routes should use these helpers to ensure consistent response format:
 * { success: boolean, data: T | null, error: { message, code, details? } | null, pagination? }
 *
 * @module lib/api-response
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

interface ApiError {
  message: string
  code: string
  details?: string
}

interface PaginationInfo {
  total: number | null
  limit: number
  offset: number
  has_more: boolean
}

interface ApiSuccessResponse<T> {
  success: true
  data: T
  error: null
  pagination?: PaginationInfo
}

interface ApiErrorResponse {
  success: false
  data: null
  error: ApiError
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Returns a standardized success response
 */
export function apiSuccess<T>(data: T, pagination?: PaginationInfo, status = 200): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    error: null,
  }
  if (pagination) {
    body.pagination = pagination
  }
  return NextResponse.json(body, { status })
}

/**
 * Returns a standardized error response
 */
export function apiError(message: string, code: string, status = 500, details?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { message, code, ...(details ? { details } : {}) },
    },
    { status }
  )
}

// ============================================================================
// Supabase Client Helper
// ============================================================================

/**
 * Creates a Supabase client for server-side API routes.
 * Prefers SUPABASE_SERVICE_KEY, falls back to anon key.
 */
export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
