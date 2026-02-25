#!/bin/bash
#
# API Smoke Test — validates all Next.js dashboard endpoints
# Usage: ./scripts/smoke-test.sh [--group core|triggers|eval|support|all]
#
# Output: terminal summary + datasets/reports/smoke-YYYY-MM-DD.json
#

# ─────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:3000}"
REPORT_DIR="$(cd "$(dirname "$0")/.." && pwd)/datasets/reports"
REPORT_FILE="${REPORT_DIR}/smoke-$(date +%Y-%m-%d).json"
TIMEOUT=10

# ─────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────
# COUNTERS & RESULTS ACCUMULATOR
# ─────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0
RESULTS_JSON="[]"

# ─────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────
GROUP="all"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --group)
      GROUP="$2"
      shift 2
      ;;
    --group=*)
      GROUP="${1#*=}"
      shift
      ;;
    *)
      echo -e "${RED}Unknown argument: $1${NC}"
      echo "Usage: $0 [--group core|triggers|eval|support|all]"
      exit 1
      ;;
  esac
done

if [[ ! "$GROUP" =~ ^(core|triggers|eval|support|all)$ ]]; then
  echo -e "${RED}Invalid group: $GROUP${NC}"
  echo "Valid groups: core, triggers, eval, support, all"
  exit 1
fi

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

# Append a result object to the RESULTS_JSON array.
# Args: description, method, path, expected, actual, status (PASS|FAIL|SKIP)
_append_result() {
  local description="$1"
  local method="$2"
  local path="$3"
  local expected="$4"
  local actual="$5"
  local status="$6"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Build a single JSON object via printf to avoid jq dependency
  local obj
  obj=$(printf '{"timestamp":"%s","description":"%s","method":"%s","path":"%s","expected_status":%s,"actual_status":%s,"result":"%s"}' \
    "$ts" \
    "$(echo "$description" | sed 's/"/\\"/g')" \
    "$method" \
    "$path" \
    "$expected" \
    "$actual" \
    "$status")

  # Append to the array (strip trailing ']', add object, close array)
  RESULTS_JSON="${RESULTS_JSON%]},${obj}]"
  # Fix the opening bracket edge case (first element)
  RESULTS_JSON="${RESULTS_JSON/\[,/[}"
}

# Core test function.
# Args: method, path, expected_status, body (use "" for no body), description
test_endpoint() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local body="$4"
  local description="$5"

  local url="${BASE_URL}${path}"
  local curl_args=(-s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X "$method")

  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "$body")
  fi

  local actual_status
  actual_status=$(curl "${curl_args[@]}" "$url" 2>/dev/null)
  local curl_exit=$?

  # curl timeout or connection refused
  if [[ $curl_exit -ne 0 ]]; then
    echo -e "  ${RED}FAIL${NC}  ${BOLD}${method}${NC} ${path}"
    echo -e "        ${RED}Connection error (curl exit ${curl_exit}) — is the server running at ${BASE_URL}?${NC}"
    FAIL=$((FAIL + 1))
    _append_result "$description" "$method" "$path" "$expected_status" "0" "FAIL"
    return
  fi

  if [[ "$actual_status" == "$expected_status" ]]; then
    echo -e "  ${GREEN}PASS${NC}  ${BOLD}${method}${NC} ${path}  (${actual_status}) — ${description}"
    PASS=$((PASS + 1))
    _append_result "$description" "$method" "$path" "$expected_status" "$actual_status" "PASS"
  else
    echo -e "  ${RED}FAIL${NC}  ${BOLD}${method}${NC} ${path}  (expected ${expected_status}, got ${actual_status}) — ${description}"
    FAIL=$((FAIL + 1))
    _append_result "$description" "$method" "$path" "$expected_status" "$actual_status" "FAIL"
  fi
}

# Skip a named group — records SKIP entries without making HTTP calls.
skip_group() {
  local group_name="$1"
  shift
  # Remaining args: pairs of "METHOD /path description"
  echo -e "  ${YELLOW}SKIP${NC}  Group '${group_name}' not selected"
  SKIP=$((SKIP + 1))
}

# ─────────────────────────────────────────
# PREFLIGHT: server reachability
# ─────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ API SMOKE TEST ━━━${NC}"
echo -e "  Base URL : ${CYAN}${BASE_URL}${NC}"
echo -e "  Group    : ${CYAN}${GROUP}${NC}"
echo -e "  Report   : ${CYAN}${REPORT_FILE}${NC}"
echo ""

echo -n "Checking server availability... "
if ! curl -s -o /dev/null --max-time 5 "${BASE_URL}"; then
  echo -e "${RED}UNREACHABLE${NC}"
  echo -e "${RED}Server not responding at ${BASE_URL}. Start the dev server with: pnpm dev${NC}"
  exit 1
fi
echo -e "${GREEN}OK${NC}"
echo ""

# ─────────────────────────────────────────
# GROUP: core — standard GET endpoints
# ─────────────────────────────────────────
run_core() {
  echo -e "${BOLD}── core: GET endpoints (expect 200) ──${NC}"
  test_endpoint "GET"  "/api/prompts/names"        200  ""  "List prompt names"
  test_endpoint "GET"  "/api/personas"             200  ""  "List personas"
  test_endpoint "GET"  "/api/evaluator-configs"    200  ""  "List evaluator configs"
  test_endpoint "GET"  "/api/test-runs"            200  ""  "List test runs"
  test_endpoint "GET"  "/api/conversations"        200  ""  "List conversations"
  test_endpoint "GET"  "/api/criteria-definitions" 200  ""  "List criteria definitions"
  test_endpoint "GET"  "/api/battle-notes"         200  ""  "List battle notes"
  test_endpoint "GET"  "/api/settings"             200  ""  "Get settings"
  echo ""
}

# ─────────────────────────────────────────
# GROUP: eval — dashboard analytics endpoints
# ─────────────────────────────────────────
run_eval() {
  echo -e "${BOLD}── eval: analytics GET endpoints (expect 200) ──${NC}"
  test_endpoint "GET"  "/api/evaluations?test_run_id=latest"  200  ""  "Get evaluations for latest test run"
  test_endpoint "GET"  "/api/dashboard/stats"                 200  ""  "Dashboard stats"
  test_endpoint "GET"  "/api/dashboard/trend"                 200  ""  "Dashboard trend data"
  test_endpoint "GET"  "/api/dashboard/criteria"              200  ""  "Dashboard criteria breakdown"
  echo ""
}

# ─────────────────────────────────────────
# GROUP: triggers — POST with empty body (expect 400, not 500)
# A 400 means the handler parsed the request and returned a proper
# validation error. A 500 means unhandled exception — a regression.
# ─────────────────────────────────────────
run_triggers() {
  echo -e "${BOLD}── triggers: POST empty body (expect 400 validation error) ──${NC}"
  test_endpoint "POST"  "/api/n8n/trigger"        400  "{}"  "n8n trigger rejects empty payload"
  test_endpoint "POST"  "/api/test-runs"          400  "{}"  "Create test-run rejects empty payload"
  test_endpoint "POST"  "/api/generate-personas"  400  "{}"  "Generate personas rejects empty payload"
  echo ""
}

# ─────────────────────────────────────────
# GROUP: support — error handling / 404 paths
# ─────────────────────────────────────────
run_support() {
  echo -e "${BOLD}── support: error handling (expect 404) ──${NC}"
  test_endpoint "GET"  "/api/test-runs/nonexistent"         404  ""  "Non-existent test run returns 404"
  test_endpoint "GET"  "/api/evaluator-configs/nonexistent" 404  ""  "Non-existent evaluator config returns 404"
  echo ""
}

# ─────────────────────────────────────────
# DISPATCH
# ─────────────────────────────────────────
case "$GROUP" in
  core)
    run_core
    ;;
  eval)
    run_eval
    ;;
  triggers)
    run_triggers
    ;;
  support)
    run_support
    ;;
  all)
    run_core
    run_eval
    run_triggers
    run_support
    ;;
esac

# ─────────────────────────────────────────
# SAVE JSON REPORT
# ─────────────────────────────────────────
mkdir -p "$REPORT_DIR"

cat > "$REPORT_FILE" <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "base_url": "${BASE_URL}",
  "group": "${GROUP}",
  "summary": {
    "pass": ${PASS},
    "fail": ${FAIL},
    "skip": ${SKIP},
    "total": $((PASS + FAIL + SKIP))
  },
  "results": ${RESULTS_JSON}
}
EOF

# ─────────────────────────────────────────
# TERMINAL SUMMARY
# ─────────────────────────────────────────
TOTAL=$((PASS + FAIL + SKIP))

echo -e "${BOLD}━━━ SUMMARY ━━━${NC}"
printf "  %-8s %s\n" "PASS"  "$(echo -e "${GREEN}${PASS}${NC}")"
printf "  %-8s %s\n" "FAIL"  "$(echo -e "${RED}${FAIL}${NC}")"
printf "  %-8s %s\n" "SKIP"  "$(echo -e "${YELLOW}${SKIP}${NC}")"
printf "  %-8s %s\n" "TOTAL" "${TOTAL}"
echo ""
echo -e "  Report saved: ${CYAN}${REPORT_FILE}${NC}"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}${BOLD}SMOKE TEST FAILED${NC} — ${FAIL} endpoint(s) did not meet expectations"
  exit 1
else
  echo -e "${GREEN}${BOLD}SMOKE TEST PASSED${NC}"
  exit 0
fi
