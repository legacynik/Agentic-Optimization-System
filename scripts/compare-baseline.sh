#!/bin/bash
#
# compare-baseline.sh
#
# Purpose: Compare a test run's evaluation scores against a golden set of
# expected scores. Each golden file maps a persona scenario to per-criterion
# expected scores; this script computes deltas, classifies them, prints a
# formatted table, and saves a JSON report.
#
# Usage:
#   ./scripts/compare-baseline.sh <test_run_id>   Compare run against golden set
#   ./scripts/compare-baseline.sh --latest        Compare most recent completed run
#   ./scripts/compare-baseline.sh --help          Show this message
#
# Exit codes:
#   0  All criteria PASS
#   1  At least one criterion is WARN
#   2  At least one criterion is FAIL
#

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL="${BASE_URL:-http://localhost:3000}"
GOLDEN_DIR="${GOLDEN_DIR:-datasets/golden/expected}"
REPORT_DIR="${REPORT_DIR:-datasets/reports}"
THRESHOLD="${THRESHOLD:-1.0}"          # |delta| > this → FAIL
WARN_THRESHOLD="${WARN_THRESHOLD:-0.5}" # |delta| > this → WARN

# ANSI colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Resolved absolute paths so all file operations survive any working-directory
# change that the caller might impose.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ABS_GOLDEN_DIR="${PROJECT_ROOT}/${GOLDEN_DIR}"
ABS_REPORT_DIR="${PROJECT_ROOT}/${REPORT_DIR}"

TODAY="$(date +%Y-%m-%d)"

# ─────────────────────────────────────────────────────────────────────────────
# Preflight checks
# ─────────────────────────────────────────────────────────────────────────────

check_jq() {
  if ! command -v jq &>/dev/null; then
    echo -e "${RED}ERROR: jq is not installed.${NC}" >&2
    echo "  jq is required for JSON parsing." >&2
    echo "  Install instructions:" >&2
    echo "    macOS:          brew install jq" >&2
    echo "    Ubuntu/Debian:  sudo apt-get install jq" >&2
    echo "    RHEL/Fedora:    sudo dnf install jq" >&2
    echo "    Official docs:  https://stedolan.github.io/jq/download/" >&2
    exit 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers
# ─────────────────────────────────────────────────────────────────────────────

# api_get <path> → prints raw JSON response body
api_get() {
  local path="${1}"
  local url="${BASE_URL}${path}"
  curl -sf --max-time 30 "${url}" || {
    echo -e "${RED}ERROR: GET ${url} failed${NC}" >&2
    return 1
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Formatting helpers
# ─────────────────────────────────────────────────────────────────────────────

divider() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

thin_divider() {
  echo "───────────────────────────────────────────────────────────────────"
}

# ─────────────────────────────────────────────────────────────────────────────
# resolve_test_run_id
#
# When called with --latest, queries the API for the most recently completed
# run and returns its ID. Otherwise passes the provided ID through unchanged.
# ─────────────────────────────────────────────────────────────────────────────

resolve_test_run_id() {
  local arg="${1}"

  if [[ "${arg}" == "--latest" ]]; then
    echo -n "Fetching most recent completed run... " >&2
    local runs_json
    runs_json="$(api_get '/api/test-runs?status=completed&limit=1')"

    local run_id
    run_id="$(echo "${runs_json}" | jq -r '.data[0].id // empty')"

    if [[ -z "${run_id}" ]]; then
      echo -e "${RED}NONE${NC}" >&2
      echo "ERROR: No completed test runs found at /api/test-runs?status=completed&limit=1" >&2
      exit 1
    fi

    local run_code
    run_code="$(echo "${runs_json}" | jq -r '.data[0].test_run_code // "unknown"')"
    echo -e "${GREEN}OK${NC} — ${run_code} (${run_id})" >&2
    echo "${run_id}"
  else
    echo "${arg}"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# fetch_evaluations
#
# Fetches /api/test-runs/<id> and /api/evaluations?test_run_id=<id>, then
# builds a normalised map:
#   {
#     "<persona_category>/<scenario>": {
#       "overall": <score>,
#       "<criterion>": <score>,
#       ...
#     }
#   }
#
# The actual categories and scores come from the per-battle breakdown inside
# the evaluations response.  When per-battle criterion scores are not present
# (older runs), only the overall battle score is used.
# ─────────────────────────────────────────────────────────────────────────────

fetch_evaluations() {
  local test_run_id="${1}"

  echo -n "Fetching test run details... " >&2
  local run_json
  run_json="$(api_get "/api/test-runs/${test_run_id}")"

  local run_code run_status
  run_code="$(echo "${run_json}"  | jq -r '.data.test_run_code // "unknown"')"
  run_status="$(echo "${run_json}" | jq -r '.data.status        // "unknown"')"
  echo -e "${GREEN}OK${NC} — ${run_code} (status: ${run_status})" >&2

  echo -n "Fetching evaluation scores... " >&2
  local evals_json
  evals_json="$(api_get "/api/evaluations?test_run_id=${test_run_id}")"

  local eval_count
  eval_count="$(echo "${evals_json}" | jq '.data | length')"
  echo -e "${GREEN}OK${NC} — ${eval_count} evaluation record(s)" >&2

  # Build the normalised map.
  #
  # Each evaluation record may contain a battles array. If a battle carries
  # criterion_scores (a map of criterion→score), we use those; otherwise we
  # fall back to the battle's top-level score field as "overall".
  # The grouping key is "<persona_category>/<scenario>", where scenario
  # defaults to "default" when not present in the battle data.
  #
  local scores_map
  scores_map="$(echo "${evals_json}" | jq -c '
    [
      .data[] |
      select(.status == "completed") |
      .battles[]? |
      {
        key: (
          ((.persona_category // "unknown") | ascii_downcase | gsub(" "; "_"))
          + "/"
          + ((.scenario // "default") | ascii_downcase | gsub(" "; "_"))
        ),
        scores: (
          if (.criterion_scores | type) == "object" and (.criterion_scores | length) > 0
          then
            (.criterion_scores + {overall: (.score // 0)})
          else
            {overall: (.score // 0)}
          end
        )
      }
    ] |
    # Merge duplicate keys by averaging their scores
    group_by(.key) |
    map({
      key: .[0].key,
      value: (
        . as $group |
        ([$group[].scores | keys[]] | unique) |
        map(. as $k | {
          key: $k,
          value: (
            [$group[].scores[$k] // 0] | add / length
          )
        }) |
        from_entries
      )
    }) |
    from_entries
  ')"

  echo "${scores_map}"
}

# ─────────────────────────────────────────────────────────────────────────────
# load_golden_files
#
# Reads all *.json files from ABS_GOLDEN_DIR and returns a JSON array of
# golden entries in the canonical shape:
#   [
#     {
#       "key": "<persona_category>/<scenario>",
#       "scenario": "...",
#       "persona_category": "...",
#       "expected_scores": { "overall": 8.0, "communication": 8.5, ... }
#     },
#     ...
#   ]
# ─────────────────────────────────────────────────────────────────────────────

load_golden_files() {
  local golden_files=()

  # Collect all JSON files; ignore .gitkeep and non-JSON files
  while IFS= read -r -d '' f; do
    golden_files+=("${f}")
  done < <(find "${ABS_GOLDEN_DIR}" -maxdepth 1 -name "*.json" -print0 2>/dev/null || true)

  if [[ "${#golden_files[@]}" -eq 0 ]]; then
    echo "[]"
    return
  fi

  # Merge all golden files into a single JSON array
  local combined="[]"
  for f in "${golden_files[@]}"; do
    local parsed
    parsed="$(jq -c '
      # Accept both a single object and an array of objects
      if type == "array" then .
      else [.]
      end |
      map(. + {
        key: (
          ((.persona_category // "unknown") | ascii_downcase | gsub(" "; "_"))
          + "/"
          + ((.scenario // "default") | ascii_downcase | gsub(" "; "_"))
        )
      })
    ' "${f}" 2>/dev/null || echo "[]")"
    combined="$(jq -n --argjson a "${combined}" --argjson b "${parsed}" '$a + $b')"
  done

  echo "${combined}"
}

# ─────────────────────────────────────────────────────────────────────────────
# classify_delta
#
# Given a delta (bash arithmetic only works on integers, so we rely on awk)
# return PASS / WARN / FAIL.
# ─────────────────────────────────────────────────────────────────────────────

classify_delta() {
  local delta="${1}"
  local threshold="${THRESHOLD}"
  local warn_threshold="${WARN_THRESHOLD}"

  awk -v d="${delta}" -v t="${threshold}" -v w="${warn_threshold}" '
    BEGIN {
      abs_d = (d < 0) ? -d : d
      if (abs_d <= w) { print "PASS" }
      else if (abs_d <= t) { print "WARN" }
      else { print "FAIL" }
    }
  '
}

# ─────────────────────────────────────────────────────────────────────────────
# compare_golden
#
# Core comparison logic: for every (persona_category/scenario, criterion) pair
# in the golden set, looks up the actual score and computes the delta.
# Prints the formatted table and returns counts via global variables.
# ─────────────────────────────────────────────────────────────────────────────

GLOBAL_FAIL=0
GLOBAL_WARN=0
COMPARISON_ROWS="[]"  # JSON array of result rows, built incrementally

compare_golden() {
  local test_run_id="${1}"
  local actual_map="${2}"   # JSON object: key → {criterion: score}
  local golden_array="${3}" # JSON array of golden entries

  local golden_count
  golden_count="$(echo "${golden_array}" | jq 'length')"

  echo ""
  echo -e "${BOLD}Golden Set Comparison — ${test_run_id}${NC}"
  divider
  printf "%-28s  %-20s  %-8s  %-8s  %-7s  %s\n" \
    "Persona" "Criterion" "Expected" "Actual" "Delta" "Status"
  thin_divider

  local rows="[]"

  # Iterate over every golden entry
  while IFS= read -r entry; do
    local key scenario persona_category expected_scores
    key="$(echo "${entry}"             | jq -r '.key')"
    scenario="$(echo "${entry}"        | jq -r '.scenario // "default"')"
    persona_category="$(echo "${entry}" | jq -r '.persona_category // "unknown"')"
    expected_scores="$(echo "${entry}" | jq -c '.expected_scores // {}')"

    # Fetch the actual scores map for this key (empty object if not found)
    local actual_scores
    actual_scores="$(echo "${actual_map}" | jq -c --arg k "${key}" '.[$k] // {}')"

    # Iterate over each criterion defined in the golden entry
    while IFS= read -r criterion; do
      local expected actual delta status

      expected="$(echo "${expected_scores}" | jq -r --arg c "${criterion}" '.[$c] // 0')"
      actual="$(echo "${actual_scores}"   | jq -r --arg c "${criterion}" '.[$c] // "N/A"')"

      # If no actual score, mark as missing
      if [[ "${actual}" == "N/A" || "${actual}" == "null" ]]; then
        delta="N/A"
        status="WARN"
        ((GLOBAL_WARN++)) || true
      else
        delta="$(awk -v a="${actual}" -v e="${expected}" 'BEGIN { printf "%.4f", a - e }')"
        status="$(classify_delta "${delta}")"
        case "${status}" in
          FAIL) ((GLOBAL_FAIL++)) || true ;;
          WARN) ((GLOBAL_WARN++)) || true ;;
        esac
      fi

      # Format display values
      local expected_fmt actual_fmt delta_fmt
      expected_fmt="$(printf "%.2f" "${expected}")"
      if [[ "${actual}" == "N/A" ]]; then
        actual_fmt="N/A"
        delta_fmt="N/A"
      else
        actual_fmt="$(printf "%.2f" "${actual}")"
        delta_fmt="$(printf "%+.2f" "${delta}")"
      fi

      # Colour status indicator
      local status_icon
      case "${status}" in
        PASS) status_icon="${GREEN}PASS${NC}" ;;
        WARN) status_icon="${YELLOW}WARN${NC}" ;;
        FAIL) status_icon="${RED}FAIL${NC}" ;;
        *)    status_icon="${status}" ;;
      esac

      local display_key="${persona_category}/${scenario}"
      printf "%-28s  %-20s  %-8s  %-8s  %-7s  " \
        "${display_key:0:28}" \
        "${criterion:0:20}" \
        "${expected_fmt}" \
        "${actual_fmt}" \
        "${delta_fmt}"
      echo -e "${status_icon}"

      # Accumulate row for the JSON report
      local row
      row="$(jq -n \
        --arg key "${key}" \
        --arg scenario "${scenario}" \
        --arg persona_category "${persona_category}" \
        --arg criterion "${criterion}" \
        --argjson expected "${expected}" \
        --arg actual "${actual_fmt}" \
        --arg delta "${delta_fmt}" \
        --arg status "${status}" \
        '{
          key: $key,
          scenario: $scenario,
          persona_category: $persona_category,
          criterion: $criterion,
          expected: $expected,
          actual: (if $actual == "N/A" then null else ($actual | tonumber) end),
          delta: (if $delta == "N/A" then null else ($delta | tonumber) end),
          status: $status
        }')"
      rows="$(jq -n --argjson rows "${rows}" --argjson row "${row}" '$rows + [$row]')"

    done < <(echo "${expected_scores}" | jq -r 'keys[]')

  done < <(echo "${golden_array}" | jq -c '.[]')

  COMPARISON_ROWS="${rows}"
}

# ─────────────────────────────────────────────────────────────────────────────
# save_report
# ─────────────────────────────────────────────────────────────────────────────

save_report() {
  local test_run_id="${1}"
  local overall_result="${2}"

  mkdir -p "${ABS_REPORT_DIR}"
  local report_file="${ABS_REPORT_DIR}/${TODAY}-golden-compare.json"

  jq -n \
    --arg date "${TODAY}" \
    --arg test_run_id "${test_run_id}" \
    --arg overall_result "${overall_result}" \
    --argjson fail_count "${GLOBAL_FAIL}" \
    --argjson warn_count "${GLOBAL_WARN}" \
    --arg threshold "${THRESHOLD}" \
    --arg warn_threshold "${WARN_THRESHOLD}" \
    --argjson rows "${COMPARISON_ROWS}" \
    '{
      date: $date,
      test_run_id: $test_run_id,
      overall_result: $overall_result,
      fail_count: $fail_count,
      warn_count: $warn_count,
      thresholds: {
        fail: ($threshold | tonumber),
        warn: ($warn_threshold | tonumber)
      },
      rows: $rows
    }' > "${report_file}"

  echo "${report_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# show_help
# ─────────────────────────────────────────────────────────────────────────────

show_help() {
  cat <<'EOF'

compare-baseline.sh — Compare a test run against golden expected scores.

Usage:
  ./scripts/compare-baseline.sh <test_run_id>   Compare specific run
  ./scripts/compare-baseline.sh --latest        Compare most recent completed run
  ./scripts/compare-baseline.sh --help          Show this message

Environment variables:
  BASE_URL          API base URL           (default: http://localhost:3000)
  GOLDEN_DIR        Golden expected files  (default: datasets/golden/expected)
  REPORT_DIR        Output reports dir     (default: datasets/reports)
  THRESHOLD         FAIL threshold         (default: 1.0)
  WARN_THRESHOLD    WARN threshold         (default: 0.5)

Golden file format (datasets/golden/expected/*.json):
  {
    "scenario": "happy_path",
    "persona_category": "easy",
    "expected_scores": {
      "overall": 8.0,
      "communication": 8.5,
      "problem_solving": 7.5
    }
  }

Exit codes:
  0  All criteria PASS
  1  At least one criterion is WARN  (|delta| > WARN_THRESHOLD)
  2  At least one criterion is FAIL  (|delta| > THRESHOLD)

Examples:
  ./scripts/compare-baseline.sh 550e8400-e29b-41d4-a716-446655440000
  ./scripts/compare-baseline.sh --latest
  BASE_URL=http://localhost:3001 ./scripts/compare-baseline.sh --latest

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# main
# ─────────────────────────────────────────────────────────────────────────────

main() {
  local arg="${1:-}"

  case "${arg}" in
    --help|-h|help)
      show_help
      exit 0
      ;;
    "")
      echo -e "${RED}ERROR: No argument provided.${NC}" >&2
      show_help
      exit 1
      ;;
  esac

  # ── Preflight ──────────────────────────────────────────────────────────────
  check_jq

  # ── Resolve test_run_id ────────────────────────────────────────────────────
  local test_run_id
  test_run_id="$(resolve_test_run_id "${arg}")"

  # ── Load golden expected files ─────────────────────────────────────────────
  echo -n "Loading golden expected files from ${GOLDEN_DIR}/... " >&2

  local golden_array
  golden_array="$(load_golden_files)"

  local golden_count
  golden_count="$(echo "${golden_array}" | jq 'length')"

  if [[ "${golden_count}" -eq 0 ]]; then
    echo -e "${YELLOW}NONE${NC}" >&2
    echo "" >&2
    echo -e "${YELLOW}No golden expected files found in ${GOLDEN_DIR}/.${NC}" >&2
    echo "Create JSON files there with the following format:" >&2
    echo "" >&2
    echo '  {' >&2
    echo '    "scenario": "happy_path",' >&2
    echo '    "persona_category": "easy",' >&2
    echo '    "expected_scores": {' >&2
    echo '      "overall": 8.0,' >&2
    echo '      "communication": 8.5,' >&2
    echo '      "problem_solving": 7.5' >&2
    echo '    }' >&2
    echo '  }' >&2
    echo "" >&2
    echo "See --help for full documentation." >&2
    exit 0
  fi

  echo -e "${GREEN}OK${NC} — ${golden_count} scenario(s)" >&2

  # ── Fetch actual evaluation scores ────────────────────────────────────────
  local actual_map
  actual_map="$(fetch_evaluations "${test_run_id}")"

  # ── Run comparison ─────────────────────────────────────────────────────────
  compare_golden "${test_run_id}" "${actual_map}" "${golden_array}"

  # ── Determine overall result ───────────────────────────────────────────────
  local overall_result
  if [[ "${GLOBAL_FAIL}" -gt 0 ]]; then
    overall_result="FAIL"
  elif [[ "${GLOBAL_WARN}" -gt 0 ]]; then
    overall_result="WARN"
  else
    overall_result="PASS"
  fi

  # ── Print summary ──────────────────────────────────────────────────────────
  divider

  local result_label
  case "${overall_result}" in
    PASS) result_label="${GREEN}PASS${NC}" ;;
    WARN) result_label="${YELLOW}WARN (${GLOBAL_WARN} warning(s), ${GLOBAL_FAIL} failure(s))${NC}" ;;
    FAIL) result_label="${RED}FAIL (${GLOBAL_FAIL} failure(s), ${GLOBAL_WARN} warning(s))${NC}" ;;
  esac
  printf "Result: "
  echo -e "${result_label}"
  echo ""

  # ── Save JSON report ───────────────────────────────────────────────────────
  local report_path
  report_path="$(save_report "${test_run_id}" "${overall_result}")"
  echo -e "${CYAN}Report saved to: ${report_path}${NC}"
  echo ""

  # ── CI exit codes ──────────────────────────────────────────────────────────
  if [[ "${overall_result}" == "FAIL" ]]; then
    exit 2
  elif [[ "${overall_result}" == "WARN" ]]; then
    exit 1
  fi
  exit 0
}

main "$@"
