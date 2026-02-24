/**
 * Evidence Verification Utility
 *
 * 3-tier verification of evidence/quotes cited in analysis_report.insights[].
 * Checks each evidence string against actual transcript content.
 *
 * Tiers:
 * - exact: Quoted text found verbatim in a transcript
 * - pattern: Evidence describes a cross-conversation pattern (summary-level claim)
 * - unverified: Neither exact match nor pattern detected
 *
 * @module lib/evidence-verification
 */

export interface EvidenceVerification {
  insight_index: number
  evidence_index: number
  status: 'exact' | 'pattern' | 'unverified'
  matched_in: string | null
}

export interface VerificationSummary {
  total: number
  exact: number
  pattern: number
  unverified: number
  verified_at: string
}

export interface VerificationResult {
  items: EvidenceVerification[]
  summary: VerificationSummary
}

interface AnalysisInsight {
  evidence?: string[]
  [key: string]: unknown
}

interface AnalysisReport {
  insights?: AnalysisInsight[]
  [key: string]: unknown
}

/** Phrases that signal a pattern-level (cross-conversation) observation */
const PATTERN_PHRASES = [
  'pattern observed',
  'across',
  'consistently',
  'tends to',
  'generally',
  'in most conversations',
  'repeatedly',
  'in several',
  'multiple conversations',
  'recurring',
  'common theme',
]

/**
 * Verifies evidence strings against transcript content.
 *
 * For each evidence string in each insight:
 * 1. Extracts quoted text (10+ chars) and checks for exact substring match
 * 2. If no exact match, checks for pattern-level language (2+ pattern phrases)
 * 3. Otherwise marks as unverified
 */
export function verifyEvidence(
  analysisReport: AnalysisReport | null | undefined,
  transcripts: string[]
): VerificationResult {
  const items: EvidenceVerification[] = []

  if (!analysisReport?.insights) {
    return { items, summary: buildSummary(items) }
  }

  // Normalize transcripts once for case-insensitive matching
  const normalizedTranscripts = transcripts
    .filter(Boolean)
    .map(t => t.toLowerCase())

  for (let i = 0; i < analysisReport.insights.length; i++) {
    const insight = analysisReport.insights[i]
    if (!insight.evidence || !Array.isArray(insight.evidence)) continue

    for (let j = 0; j < insight.evidence.length; j++) {
      const evidence = insight.evidence[j]
      if (typeof evidence !== 'string') continue

      let status: EvidenceVerification['status'] = 'unverified'
      let matched_in: string | null = null

      // Tier 1: Exact substring match -- extract quoted text (single or double quotes)
      const quoteMatch = evidence.match(/'([^']{10,})'|"([^"]{10,})"/)
      if (quoteMatch) {
        const quote = (quoteMatch[1] || quoteMatch[2]).toLowerCase()
        for (const transcript of normalizedTranscripts) {
          if (transcript.includes(quote)) {
            status = 'exact'
            matched_in = 'transcript'
            break
          }
        }
      }

      // Tier 2: Pattern summary detection (need 2+ pattern phrases)
      if (status === 'unverified') {
        const evidenceLower = evidence.toLowerCase()
        const matchCount = PATTERN_PHRASES.filter(p =>
          evidenceLower.includes(p)
        ).length
        if (matchCount >= 2) {
          status = 'pattern'
        }
      }

      items.push({ insight_index: i, evidence_index: j, status, matched_in })
    }
  }

  return { items, summary: buildSummary(items) }
}

/** Builds a summary of verification results */
function buildSummary(items: EvidenceVerification[]): VerificationSummary {
  return {
    total: items.length,
    exact: items.filter(i => i.status === 'exact').length,
    pattern: items.filter(i => i.status === 'pattern').length,
    unverified: items.filter(i => i.status === 'unverified').length,
    verified_at: new Date().toISOString(),
  }
}
