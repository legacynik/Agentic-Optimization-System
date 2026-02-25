#!/bin/bash
#
# prompt-regression.sh
#
# Purpose: Compare test run results against a saved baseline to detect prompt
# regressions. Per-criterion score deltas are classified as PASS / WARN / FAIL
# according to a configurable threshold.
#
# Usage:
#   ./scripts/prompt-regression.sh --baseline          Save current best run as baseline
#   ./scripts/prompt-regression.sh --run               Launch a new test, then compare
#   ./scripts/prompt-regression.sh --compare [run_id]  Compare existing run with baseline
#   ./scripts/prompt-regression.sh --help              Show this help text
#

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Environment / Configuration
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL="${BASE_URL:-http://localhost:3000}"
BASELINE_DIR="${BASELINE_DIR:-datasets/baselines}"
REPORT_DIR="${REPORT_DIR:-datasets/reports}"
THRESHOLD="${THRESHOLD:-1.0}"          # FAIL when any criterion drops > this
WARN_THRESHOLD="0.5"                   # WARN when drop > this but <= THRESHOLD
POLL_INTERVAL=10                       # seconds between status polls
POLL_MAX=30                            # 30 × 10s = 5-minute timeout

# ANSI colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Resolved paths (absolute, so they survive any cd)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ABS_BASELINE_DIR="${PROJECT_ROOT}/${BASELINE_DIR}"
ABS_REPORT_DIR="${PROJECT_ROOT}/${REPORT_DIR}"

TODAY="$(date +%Y-%m-%d)"

# ─────────────────────────────────────────────────────────────────────────────
# Preflight: jq
# ─────────────────────────────────────────────────────────────────────────────

check_jq() {
  if ! command -v jq &>/dev/null; then
    echo -e "${YELLOW}WARNING: jq is not installed. JSON parsing will not work correctly.${NC}"
    echo "  Install jq: https://stedolan.github.io/jq/download/"
    echo "  macOS: brew install jq"
    echo "  Ubuntu/Debian: apt-get install jq"
    return 1
  fi
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: HTTP wrappers
# ─────────────────────────────────────────────────────────────────────────────

# GET $1 → stdout (raw JSON body)
api_get() {
  local url="${BASE_URL}${1}"
  curl -sf --max-time 30 "${url}" || {
    echo -e "${RED}ERROR: GET ${url} failed${NC}" >&2
    return 1
  }
}

# POST $1 with body $2 → stdout (raw JSON body)
api_post() {
  local url="${BASE_URL}${1}"
  local body="${2:-{}}"
  curl -sf --max-time 30 -X POST \
    -H "Content-Type: application/json" \
    -d "${body}" \
    "${url}" || {
    echo -e "${RED}ERROR: POST ${url} failed${NC}" >&2
    return 1
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: print a divider line
# ─────────────────────────────────────────────────────────────────────────────

divider() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

thin_divider() {
  echo "───────────────────────────────────────────────────"
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: ensure required directories exist
# ─────────────────────────────────────────────────────────────────────────────

ensure_dirs() {
  mkdir -p "${ABS_BASELINE_DIR}" "${ABS_REPORT_DIR}"
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. run_test
#
# Discovers the latest prompt version and a promoted evaluator config, launches
# a single-mode test run, polls until completed (or times out), fetches the
# evaluation scores, and saves everything to a dated JSON report file.
#
# Outputs the path to the saved report on stdout (last line).
# ─────────────────────────────────────────────────────────────────────────────

run_test() {
  ensure_dirs
  check_jq || exit 1

  echo ""
  echo -e "${BOLD}Prompt Regression Test — ${TODAY}${NC}"
  divider

  # ── Step 1: Find latest prompt version ────────────────────────────────────
  echo -n "Fetching latest prompt version... "
  local names_json
  names_json="$(api_get '/api/prompts/names')"

  local prompt_version_id prompt_name
  # data[] is ordered by created_at desc, first element is the latest
  prompt_version_id="$(echo "${names_json}" | jq -r '.data[0].id // empty')"
  prompt_name="$(echo "${names_json}" | jq -r '.data[0].name // empty')"

  if [[ -z "${prompt_version_id}" ]]; then
    echo -e "${RED}FAIL${NC}"
    echo "ERROR: No prompt versions found at /api/prompts/names" >&2
    exit 1
  fi
  echo -e "${GREEN}OK${NC} — ${prompt_name} (${prompt_version_id})"

  # ── Step 2: Find promoted evaluator config ────────────────────────────────
  echo -n "Fetching promoted evaluator config... "
  local configs_json
  configs_json="$(api_get '/api/evaluator-configs?is_promoted=true&limit=1')"

  local evaluator_config_id evaluator_name
  evaluator_config_id="$(echo "${configs_json}" | jq -r '.data[0].id // empty')"
  evaluator_name="$(echo "${configs_json}" | jq -r '.data[0].name // empty')"

  if [[ -z "${evaluator_config_id}" ]]; then
    echo -e "${YELLOW}WARN${NC} — no promoted evaluator config found, proceeding without one"
    evaluator_config_id=""
    evaluator_name="(none)"
  else
    echo -e "${GREEN}OK${NC} — ${evaluator_name} (${evaluator_config_id})"
  fi

  # ── Step 3: Launch test run ────────────────────────────────────────────────
  echo -n "Launching test run (mode=single)... "
  local create_payload
  create_payload="$(jq -n \
    --arg pv "${prompt_version_id}" \
    '{prompt_version_id: $pv, mode: "single"}')"

  local create_json
  create_json="$(api_post '/api/test-runs' "${create_payload}")"

  local test_run_id test_run_code
  test_run_id="$(echo "${create_json}" | jq -r '.data.test_run_id // empty')"
  test_run_code="$(echo "${create_json}" | jq -r '.data.test_run_code // empty')"

  if [[ -z "${test_run_id}" ]]; then
    echo -e "${RED}FAIL${NC}"
    echo "ERROR: Failed to create test run. Response:" >&2
    echo "${create_json}" >&2
    exit 1
  fi
  echo -e "${GREEN}OK${NC} — ${test_run_code} (${test_run_id})"

  # ── Step 4: Poll until completed ──────────────────────────────────────────
  echo -n "Waiting for completion (max $((POLL_INTERVAL * POLL_MAX))s)"
  local attempt=0
  local status=""
  while [[ ${attempt} -lt ${POLL_MAX} ]]; do
    sleep "${POLL_INTERVAL}"
    local run_json
    run_json="$(api_get "/api/test-runs/${test_run_id}")"
    status="$(echo "${run_json}" | jq -r '.data.status // "unknown"')"

    case "${status}" in
      completed)
        echo -e " ${GREEN}completed${NC}"
        break
        ;;
      failed|aborted)
        echo -e " ${RED}${status}${NC}"
        echo "ERROR: Test run ended with status '${status}'" >&2
        exit 1
        ;;
      *)
        echo -n "."
        ;;
    esac
    ((attempt++))
  done

  if [[ "${status}" != "completed" ]]; then
    echo -e " ${RED}TIMEOUT${NC}"
    echo "ERROR: Test run did not complete within $((POLL_INTERVAL * POLL_MAX)) seconds" >&2
    exit 1
  fi

  # ── Step 5: Fetch evaluation scores ──────────────────────────────────────
  echo -n "Fetching evaluation scores... "
  local evals_json
  evals_json="$(api_get "/api/evaluations?test_run_id=${test_run_id}")"

  local overall_score
  overall_score="$(echo "${evals_json}" | jq -r \
    '[.data[] | select(.overall_score != null) | .overall_score] | add / length // 0')"

  # Build per-criterion map from the promoted evaluation (or first completed one)
  local criteria_json
  criteria_json="$(echo "${evals_json}" | jq -c \
    '.data | map(select(.status == "completed")) | first // {} |
     {
       evaluator_name: .evaluator_name,
       evaluator_version: .evaluator_version,
       overall_score: .overall_score,
       success_count: .success_count,
       failure_count: .failure_count,
       partial_count: .partial_count,
       battles_evaluated: .battles_evaluated
     }')"

  echo -e "${GREEN}OK${NC} — overall_score=${overall_score}"

  # ── Step 6: Persist run report ────────────────────────────────────────────
  local report_file="${ABS_REPORT_DIR}/${TODAY}-run.json"
  jq -n \
    --arg date "${TODAY}" \
    --arg test_run_id "${test_run_id}" \
    --arg test_run_code "${test_run_code}" \
    --arg prompt_version_id "${prompt_version_id}" \
    --arg prompt_name "${prompt_name}" \
    --argjson criteria "${criteria_json}" \
    --argjson overall "${overall_score}" \
    --argjson evals "${evals_json}" \
    '{
      date: $date,
      test_run_id: $test_run_id,
      test_run_code: $test_run_code,
      prompt_version_id: $prompt_version_id,
      prompt_name: $prompt_name,
      overall_score: $overall,
      criteria_summary: $criteria,
      raw_evaluations: $evals.data
    }' > "${report_file}"

  echo "Report saved to: ${report_file}"

  # Return the path for the caller
  echo "${report_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. save_baseline
#
# Copies the latest run report into the baselines directory and updates
# metadata.json with the key identifiers.
# ─────────────────────────────────────────────────────────────────────────────

save_baseline() {
  ensure_dirs
  check_jq || exit 1

  # Locate most recent run report (by filename sort, most recent last with -r)
  local latest_report
  latest_report="$(ls -1t "${ABS_REPORT_DIR}"/*-run.json 2>/dev/null | head -1 || true)"

  if [[ -z "${latest_report}" ]]; then
    echo -e "${RED}ERROR: No run report found in ${REPORT_DIR}/${NC}" >&2
    echo "Run './scripts/prompt-regression.sh --run' first to generate one." >&2
    exit 1
  fi

  echo ""
  echo -e "${BOLD}Saving Baseline — ${TODAY}${NC}"
  divider

  # Extract key fields from the run report
  local test_run_id test_run_code prompt_version_id prompt_name overall_score
  test_run_id="$(jq -r '.test_run_id' "${latest_report}")"
  test_run_code="$(jq -r '.test_run_code' "${latest_report}")"
  prompt_version_id="$(jq -r '.prompt_version_id' "${latest_report}")"
  prompt_name="$(jq -r '.prompt_name' "${latest_report}")"
  overall_score="$(jq -r '.overall_score' "${latest_report}")"

  # Copy run report as the canonical baseline data file
  local baseline_data="${ABS_BASELINE_DIR}/baseline-data.json"
  cp "${latest_report}" "${baseline_data}"

  # Write / overwrite metadata.json
  local metadata_file="${ABS_BASELINE_DIR}/metadata.json"
  jq -n \
    --arg saved_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg date "${TODAY}" \
    --arg test_run_id "${test_run_id}" \
    --arg test_run_code "${test_run_code}" \
    --arg prompt_version_id "${prompt_version_id}" \
    --arg prompt_name "${prompt_name}" \
    --argjson overall_score "${overall_score}" \
    --arg source_report "${latest_report}" \
    '{
      saved_at: $saved_at,
      date: $date,
      test_run_id: $test_run_id,
      test_run_code: $test_run_code,
      prompt_version_id: $prompt_version_id,
      prompt_name: $prompt_name,
      overall_score: $overall_score,
      source_report: $source_report
    }' > "${metadata_file}"

  echo "Baseline saved:"
  echo "  Source run : ${test_run_code} (${test_run_id})"
  echo "  Prompt     : ${prompt_name} (${prompt_version_id})"
  echo "  Score      : ${overall_score}"
  echo "  Data file  : ${baseline_data}"
  echo "  Metadata   : ${metadata_file}"
  divider
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. compare_with_baseline
#
# Loads baseline metadata + data and a target run report, computes per-criterion
# deltas, prints the formatted table, and saves a comparison JSON report.
#
# Arguments:
#   $1  — path to the run report JSON file to compare against baseline
#          (if empty, uses the most recent *-run.json in REPORT_DIR)
# ─────────────────────────────────────────────────────────────────────────────

compare_with_baseline() {
  local target_report="${1:-}"
  ensure_dirs
  check_jq || exit 1

  # ── Load baseline ─────────────────────────────────────────────────────────
  local metadata_file="${ABS_BASELINE_DIR}/metadata.json"
  if [[ ! -f "${metadata_file}" ]]; then
    echo -e "${RED}ERROR: No baseline found at ${BASELINE_DIR}/metadata.json${NC}" >&2
    echo "Run './scripts/prompt-regression.sh --baseline' to save a baseline first." >&2
    exit 1
  fi

  local baseline_data="${ABS_BASELINE_DIR}/baseline-data.json"
  if [[ ! -f "${baseline_data}" ]]; then
    echo -e "${RED}ERROR: Baseline data file not found: ${baseline_data}${NC}" >&2
    exit 1
  fi

  # ── Load run report ───────────────────────────────────────────────────────
  if [[ -z "${target_report}" ]]; then
    target_report="$(ls -1t "${ABS_REPORT_DIR}"/*-run.json 2>/dev/null | head -1 || true)"
    if [[ -z "${target_report}" ]]; then
      echo -e "${RED}ERROR: No run report found in ${REPORT_DIR}/${NC}" >&2
      echo "Provide a run_id or run './scripts/prompt-regression.sh --run' first." >&2
      exit 1
    fi
  fi

  # ── Extract scalar values ─────────────────────────────────────────────────
  local bl_run_code bl_prompt bl_date
  bl_run_code="$(jq -r '.test_run_code' "${metadata_file}")"
  bl_prompt="$(jq -r '.prompt_name' "${metadata_file}")"
  bl_date="$(jq -r '.date' "${metadata_file}")"

  local cur_run_code cur_prompt cur_date cur_run_id
  cur_run_code="$(jq -r '.test_run_code' "${target_report}")"
  cur_prompt="$(jq -r '.prompt_name' "${target_report}")"
  cur_date="$(jq -r '.date' "${target_report}")"
  cur_run_id="$(jq -r '.test_run_id' "${target_report}")"

  # ── Compute per-criterion deltas via jq ───────────────────────────────────
  #
  # Strategy:
  #   Both baseline and current reports store raw_evaluations[].
  #   We extract top-level numeric fields shared across both and diff them.
  #   We treat: overall_score, success_count, failure_count, partial_count,
  #             battles_evaluated as the measurable criterion set.
  #   (When battle_evaluations expose per-criterion rows in the future, extend
  #    this section to pull from criteria_summary.criteria_scores.)
  #

  local comparison_json
  comparison_json="$(jq -n \
    --slurpfile baseline "${baseline_data}" \
    --slurpfile current "${target_report}" \
    --arg threshold "${THRESHOLD}" \
    --arg warn_threshold "${WARN_THRESHOLD}" \
    '
    # Helper: classify delta (current - baseline); negative = regression
    def classify(delta; thr; wthr):
      if delta >= 0 then "PASS"
      elif (delta | fabs) <= (wthr | tonumber) then "PASS"
      elif (delta | fabs) <= (thr | tonumber) then "WARN"
      else "FAIL"
      end;

    # Pull out the first completed evaluation from each report
    def best_eval(report):
      report[0].raw_evaluations |
      map(select(.status == "completed")) |
      first // {};

    def report_score(report):
      report[0].overall_score // 0;

    def eval_field(ev; field):
      ev[field] // 0;

    ($baseline | best_eval(.)) as $bl_ev |
    ($current  | best_eval(.)) as $cur_ev |

    # Build the criterion list from scalar numeric fields we can compare
    [
      {
        name: "overall_score",
        baseline_value: ($baseline[0].overall_score // 0),
        current_value:  ($current[0].overall_score  // 0)
      },
      {
        name: "success_count",
        baseline_value: (eval_field($bl_ev;  "success_count")),
        current_value:  (eval_field($cur_ev; "success_count"))
      },
      {
        name: "failure_count",
        baseline_value: (eval_field($bl_ev;  "failure_count")),
        current_value:  (eval_field($cur_ev; "failure_count"))
      },
      {
        name: "partial_count",
        baseline_value: (eval_field($bl_ev;  "partial_count")),
        current_value:  (eval_field($cur_ev; "partial_count"))
      },
      {
        name: "battles_evaluated",
        baseline_value: (eval_field($bl_ev;  "battles_evaluated")),
        current_value:  (eval_field($cur_ev; "battles_evaluated"))
      }
    ] |
    map(. + {
      delta: (.current_value - .baseline_value),
      status: classify(
        (.current_value - .baseline_value);
        $threshold;
        $warn_threshold
      )
    })
  ')"

  if [[ -z "${comparison_json}" ]]; then
    echo -e "${RED}ERROR: Failed to compute comparison${NC}" >&2
    exit 1
  fi

  # ── Determine overall result ───────────────────────────────────────────────
  local fail_count warn_count
  fail_count="$(echo "${comparison_json}" | jq '[.[] | select(.status == "FAIL")] | length')"
  warn_count="$(echo "${comparison_json}" | jq '[.[] | select(.status == "WARN")] | length')"

  local overall_result
  if [[ "${fail_count}" -gt 0 ]]; then
    overall_result="FAIL"
  elif [[ "${warn_count}" -gt 0 ]]; then
    overall_result="WARN"
  else
    overall_result="PASS"
  fi

  # ── Print formatted table ─────────────────────────────────────────────────
  echo ""
  echo -e "${BOLD}Prompt Regression Test — ${TODAY}${NC}"
  divider
  printf "Baseline  : %s  (%s)\n" "${bl_run_code}" "${bl_date}"
  printf "Current   : %s  (%s)\n" "${cur_run_code}" "${cur_date}"
  printf "Prompt    : %s\n" "${cur_prompt}"
  printf "Threshold : FAIL if drop > %.1f  |  WARN if drop > %.1f\n" "${THRESHOLD}" "${WARN_THRESHOLD}"
  divider

  # Header row
  printf "%-22s  %-8s  %-8s  %-7s  %-6s\n" \
    "Criterion" "Baseline" "Current" "Delta" "Status"
  thin_divider

  # Data rows
  while IFS= read -r row; do
    local name bl_val cur_val delta status icon
    name="$(echo "${row}"  | jq -r '.name')"
    bl_val="$(echo "${row}" | jq -r '.baseline_value')"
    cur_val="$(echo "${row}" | jq -r '.current_value')"
    delta="$(echo "${row}"  | jq -r '.delta')"
    status="$(echo "${row}" | jq -r '.status')"

    # Format delta with sign and two decimal places
    local delta_fmt
    delta_fmt="$(printf "%+.2f" "${delta}")"

    case "${status}" in
      PASS) icon="${GREEN}PASS${NC}" ;;
      WARN) icon="${YELLOW}WARN${NC}" ;;
      FAIL) icon="${RED}FAIL${NC}" ;;
      *)    icon="${status}" ;;
    esac

    printf "%-22s  %-8.2f  %-8.2f  %-7s  " \
      "${name}" "${bl_val}" "${cur_val}" "${delta_fmt}"
    echo -e "${icon}"
  done < <(echo "${comparison_json}" | jq -c '.[]')

  divider

  # Result line
  local result_label=""
  case "${overall_result}" in
    PASS) result_label="${GREEN}PASS${NC}" ;;
    WARN) result_label="${YELLOW}WARN (${warn_count} criterion below soft threshold)${NC}" ;;
    FAIL) result_label="${RED}FAIL (${fail_count} criterion below threshold)${NC}" ;;
  esac
  printf "Result: "
  echo -e "${result_label}"
  echo ""

  # ── Save comparison report ────────────────────────────────────────────────
  local comparison_report="${ABS_REPORT_DIR}/${TODAY}-comparison.json"
  jq -n \
    --arg date "${TODAY}" \
    --arg baseline_run_code "${bl_run_code}" \
    --arg baseline_date "${bl_date}" \
    --arg baseline_prompt "${bl_prompt}" \
    --arg current_run_id "${cur_run_id}" \
    --arg current_run_code "${cur_run_code}" \
    --arg current_date "${cur_date}" \
    --arg current_prompt "${cur_prompt}" \
    --arg overall_result "${overall_result}" \
    --argjson fail_count "${fail_count}" \
    --argjson warn_count "${warn_count}" \
    --arg threshold "${THRESHOLD}" \
    --arg warn_threshold "${WARN_THRESHOLD}" \
    --argjson criteria "${comparison_json}" \
    '{
      date: $date,
      baseline: {
        run_code: $baseline_run_code,
        date: $baseline_date,
        prompt: $baseline_prompt
      },
      current: {
        test_run_id: $current_run_id,
        run_code: $current_run_code,
        date: $current_date,
        prompt: $current_prompt
      },
      thresholds: {
        fail: ($threshold | tonumber),
        warn: ($warn_threshold | tonumber)
      },
      overall_result: $overall_result,
      fail_count: $fail_count,
      warn_count: $warn_count,
      criteria: $criteria
    }' > "${comparison_report}"

  echo "Comparison report saved to: ${comparison_report}"

  # Exit with non-zero code so CI can detect regressions
  if [[ "${overall_result}" == "FAIL" ]]; then
    exit 2
  elif [[ "${overall_result}" == "WARN" ]]; then
    exit 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: look up a run report file for a given test_run_id
# ─────────────────────────────────────────────────────────────────────────────

find_report_for_run_id() {
  local run_id="${1}"
  ensure_dirs

  # Search all run reports for matching test_run_id
  local found=""
  while IFS= read -r f; do
    local rid
    rid="$(jq -r '.test_run_id // empty' "${f}" 2>/dev/null || true)"
    if [[ "${rid}" == "${run_id}" ]]; then
      found="${f}"
      break
    fi
  done < <(ls -1t "${ABS_REPORT_DIR}"/*-run.json 2>/dev/null || true)

  echo "${found}"
}

# ─────────────────────────────────────────────────────────────────────────────
# show_help
# ─────────────────────────────────────────────────────────────────────────────

show_help() {
  cat <<'EOF'

prompt-regression.sh — Detect prompt regressions by comparing test runs.

Usage:
  ./scripts/prompt-regression.sh --baseline          Save current best run as baseline
  ./scripts/prompt-regression.sh --run               Launch a new test, then compare
  ./scripts/prompt-regression.sh --compare [run_id]  Compare existing run with baseline
  ./scripts/prompt-regression.sh --help              Show this message

Environment variables:
  BASE_URL      API base URL (default: http://localhost:3000)
  BASELINE_DIR  Directory for baseline files (default: datasets/baselines)
  REPORT_DIR    Directory for run reports  (default: datasets/reports)
  THRESHOLD     FAIL threshold — max drop before FAIL (default: 1.0)

Exit codes:
  0  All criteria PASS
  1  At least one criterion is WARN (soft regression)
  2  At least one criterion is FAIL (hard regression)

Examples:
  # First time: run a test and save it as the baseline
  ./scripts/prompt-regression.sh --run
  ./scripts/prompt-regression.sh --baseline

  # After a prompt change: run and compare in one step
  ./scripts/prompt-regression.sh --run

  # Compare a specific historical run
  ./scripts/prompt-regression.sh --compare 550e8400-e29b-41d4-a716-446655440000

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

main() {
  local mode="${1:-}"

  case "${mode}" in

    --baseline)
      save_baseline
      ;;

    --run)
      # Launch test, then immediately compare with baseline (if one exists)
      local report_path
      report_path="$(run_test)"
      # Last line of run_test output is the report path
      local last_line
      last_line="$(echo "${report_path}" | tail -1)"

      if [[ -f "${ABS_BASELINE_DIR}/metadata.json" ]]; then
        compare_with_baseline "${last_line}"
      else
        echo ""
        echo -e "${YELLOW}NOTE: No baseline found. Save this run as baseline with:${NC}"
        echo "  ./scripts/prompt-regression.sh --baseline"
      fi
      ;;

    --compare)
      local run_id="${2:-}"
      if [[ -n "${run_id}" ]]; then
        # Resolve report file from run_id
        local report_path
        report_path="$(find_report_for_run_id "${run_id}")"
        if [[ -z "${report_path}" ]]; then
          echo -e "${RED}ERROR: No report found for run_id '${run_id}'${NC}" >&2
          echo "Available reports in ${REPORT_DIR}/:" >&2
          ls -1 "${ABS_REPORT_DIR}"/*-run.json 2>/dev/null >&2 || echo "  (none)" >&2
          exit 1
        fi
        compare_with_baseline "${report_path}"
      else
        # Use the most recent run report
        compare_with_baseline ""
      fi
      ;;

    --help|-h|help)
      show_help
      ;;

    "")
      echo -e "${RED}ERROR: No mode specified.${NC}" >&2
      show_help
      exit 1
      ;;

    *)
      echo -e "${RED}ERROR: Unknown option '${mode}'${NC}" >&2
      show_help
      exit 1
      ;;

  esac
}

main "$@"
