#!/bin/bash
#
# import-golden-set.sh — Import real call recordings into the golden dataset
#
# Usage:
#   ./scripts/import-golden-set.sh <input_dir>    Import all .txt/.json/.csv files
#   ./scripts/import-golden-set.sh <input_file>   Import a single file
#   ./scripts/import-golden-set.sh --list         List current golden set entries
#   ./scripts/import-golden-set.sh --help         Show usage
#
# Output: datasets/golden/transcripts/<name>.json + datasets/golden/manifest.json
#

set -euo pipefail

# ─────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
GOLDEN_DIR="${ROOT_DIR}/datasets/golden"
TRANSCRIPTS_DIR="${GOLDEN_DIR}/transcripts"
MANIFEST_FILE="${GOLDEN_DIR}/manifest.json"

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
# JQ CHECK
# ─────────────────────────────────────────
JQ_AVAILABLE=0
if command -v jq &>/dev/null; then
  JQ_AVAILABLE=1
else
  echo -e "${YELLOW}WARN${NC}  jq not found — JSON parsing will be limited. Install with: brew install jq"
fi

# ─────────────────────────────────────────
# MANIFEST STATE
# MANIFEST_ENTRIES holds one compact JSON object per element (no newlines inside).
# MANIFEST_SOURCE_FILES holds the source_file value per element (for duplicate detection).
# Both arrays stay in sync by index.
# ─────────────────────────────────────────
declare -a MANIFEST_ENTRIES=()
declare -a MANIFEST_SOURCE_FILES=()

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

# Sanitize a filename: lowercase, strip extension, replace non-alphanumeric with dash
sanitize_name() {
  local raw
  raw="$(basename "$1")"
  raw="${raw%.*}"
  echo "$raw" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g'
}

# Return today's date in YYYY-MM-DD
today() {
  date +%Y-%m-%d
}

# Load manifest from disk into MANIFEST_ENTRIES / MANIFEST_SOURCE_FILES arrays.
# Parses the entries[] array; works with or without jq.
load_manifest() {
  MANIFEST_ENTRIES=()
  MANIFEST_SOURCE_FILES=()

  if [[ ! -f "$MANIFEST_FILE" ]]; then
    return
  fi

  if [[ "$JQ_AVAILABLE" -eq 1 ]]; then
    _load_manifest_jq
  else
    _load_manifest_heuristic
  fi
}

_load_manifest_jq() {
  local count
  count=$(jq '.entries | length' "$MANIFEST_FILE" 2>/dev/null || echo "0")
  local i
  for (( i=0; i<count; i++ )); do
    local entry
    entry=$(jq -c ".entries[$i]" "$MANIFEST_FILE")
    local src
    src=$(jq -r ".entries[$i].source_file" "$MANIFEST_FILE")
    MANIFEST_ENTRIES+=("$entry")
    MANIFEST_SOURCE_FILES+=("$src")
  done
}

_load_manifest_heuristic() {
  # Without jq: extract source_file values line by line using grep.
  # Build entries array from blocks delimited by { ... }.
  # This is a best-effort fallback for manifests written by this script.
  local sources
  sources=$(grep -o '"source_file": "[^"]*"' "$MANIFEST_FILE" | sed 's/"source_file": "//;s/"$//' || true)
  while IFS= read -r src; do
    [[ -z "$src" ]] && continue
    MANIFEST_SOURCE_FILES+=("$src")
    MANIFEST_ENTRIES+=("{}")  # placeholder — enough for count and duplicate detection
  done <<< "$sources"
}

# True (returns 0) if source_file is already in the manifest.
manifest_has_source() {
  local source_file="$1"
  local src
  for src in "${MANIFEST_SOURCE_FILES[@]+"${MANIFEST_SOURCE_FILES[@]}"}"; do
    [[ "$src" == "$source_file" ]] && return 0
  done
  return 1
}

# Number of entries currently loaded.
manifest_count() {
  echo "${#MANIFEST_ENTRIES[@]}"
}

# Next golden ID: golden-NNN (zero-padded to 3 digits).
next_id() {
  local count="${#MANIFEST_ENTRIES[@]}"
  printf 'golden-%03d' $((count + 1))
}

# Add a new entry to the in-memory arrays.
# Args: id, source_file, transcript_file, scenario, turns
manifest_append_entry() {
  local id="$1"
  local source_file="$2"
  local transcript_file="$3"
  local scenario="$4"
  local turns="$5"

  # Build compact single-line JSON (no embedded newlines, safe for array storage).
  local entry
  entry=$(printf '{"id":"%s","source_file":"%s","transcript_file":"%s","scenario":"%s","turns":%s,"imported_at":"%s","expected_scores_file":null}' \
    "$id" "$source_file" "$transcript_file" "$scenario" "$turns" "$(today)")

  MANIFEST_ENTRIES+=("$entry")
  MANIFEST_SOURCE_FILES+=("$source_file")
}

# Serialize MANIFEST_ENTRIES to disk as pretty-printed JSON.
# Uses printf to build valid JSON without jq dependency.
save_manifest() {
  mkdir -p "$GOLDEN_DIR"

  local count="${#MANIFEST_ENTRIES[@]}"
  local output='{\n  "entries": ['

  local i
  for (( i=0; i<count; i++ )); do
    local raw="${MANIFEST_ENTRIES[$i]}"

    # Pretty-print each entry by extracting fields.
    # If jq is available, format nicely; else write compact.
    local pretty
    if [[ "$JQ_AVAILABLE" -eq 1 ]]; then
      pretty=$(echo "$raw" | jq '.')
    else
      pretty="$raw"
    fi

    # Indent each line of the pretty block by 4 spaces.
    local indented
    indented=$(echo "$pretty" | sed 's/^/    /')

    if [[ "$i" -eq 0 ]]; then
      output="${output}\n${indented}"
    else
      output="${output},\n${indented}"
    fi
  done

  output="${output}\n  ]\n}"

  printf "$output\n" > "$MANIFEST_FILE"
}

# Count turns in a transcript JSON file (grep-based, no jq required).
count_turns_in_file() {
  local file="$1"
  local n
  n=$(grep -o '"speaker"' "$file" || true)
  if [[ -z "$n" ]]; then echo "0"; return; fi
  echo "$n" | wc -l | tr -d ' '
}

# ─────────────────────────────────────────
# TXT PARSER
# Detects "Speaker: message" lines.
# Recognized labels: Agent, Persona, Customer, Bot, User, Assistant
# ─────────────────────────────────────────
parse_txt() {
  local input_file="$1"
  local output_file="$2"

  local turns_json="[]"
  local turn_count=0
  local timestamp=0

  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip blank lines
    [[ -z "${line// }" ]] && continue

    # Match "Label: message" — label is one or more words before the first colon
    if [[ "$line" =~ ^([A-Za-z][A-Za-z\ ]+):(.+)$ ]]; then
      local raw_speaker="${BASH_REMATCH[1]}"
      local message="${BASH_REMATCH[2]}"

      # Trim leading whitespace from message
      message="${message#"${message%%[![:space:]]*}"}"
      message="${message%"${message##*[![:space:]]}"}"

      # Normalize speaker label
      local speaker
      case "$(echo "$raw_speaker" | tr '[:upper:]' '[:lower:]')" in
        agent|assistant|bot)      speaker="agent"   ;;
        persona|customer|user)    speaker="persona" ;;
        *)                        speaker="$(echo "$raw_speaker" | tr '[:upper:]' '[:lower:]')" ;;
      esac

      # Escape double quotes in message
      message="${message//\"/\\\"}"

      local obj
      obj=$(printf '{"speaker":"%s","message":"%s","timestamp_ms":%d}' \
        "$speaker" "$message" "$timestamp")

      if [[ "$turn_count" -eq 0 ]]; then
        turns_json="[${obj}]"
      else
        turns_json="${turns_json%]},${obj}]"
      fi

      turn_count=$((turn_count + 1))
      timestamp=$((timestamp + 1000))
    fi
  done < "$input_file"

  if [[ "$turn_count" -eq 0 ]]; then
    echo -e "  ${YELLOW}SKIP${NC}  No speaker lines detected in: $(basename "$input_file")" >&2
    return 1
  fi

  printf '{\n  "turns": %s\n}\n' "$turns_json" > "$output_file"
  echo "$turn_count"
}

# ─────────────────────────────────────────
# JSON PARSER
# Handles:
#   - Already-structured {"turns": [...]}
#   - Array of message objects (role/speaker + message/content fields)
# Requires jq when available; falls back to grep heuristic for turns format.
# ─────────────────────────────────────────
parse_json() {
  local input_file="$1"
  local output_file="$2"

  if [[ "$JQ_AVAILABLE" -eq 1 ]]; then
    _parse_json_jq "$input_file" "$output_file"
  else
    _parse_json_heuristic "$input_file" "$output_file"
  fi
}

_parse_json_jq() {
  local input_file="$1"
  local output_file="$2"

  if ! jq empty "$input_file" 2>/dev/null; then
    echo -e "  ${RED}ERROR${NC}  Invalid JSON in: $(basename "$input_file")" >&2
    return 1
  fi

  # Case 1: already has a top-level "turns" array
  if jq -e '.turns | type == "array"' "$input_file" &>/dev/null; then
    jq '{
      turns: [
        .turns[] | {
          speaker: ((.speaker // .role // "unknown") | ascii_downcase |
            if . == "assistant" or . == "bot" then "agent"
            elif . == "customer" or . == "user" then "persona"
            else . end),
          message: (.message // .content // ""),
          timestamp_ms: (.timestamp_ms // .timestamp // 0)
        }
      ]
    }' "$input_file" > "$output_file"
    jq '.turns | length' "$output_file"
    return 0
  fi

  # Case 2: top-level array of message objects
  if jq -e 'type == "array"' "$input_file" &>/dev/null; then
    jq '{
      turns: [
        .[] | {
          speaker: ((.speaker // .role // "unknown") | ascii_downcase |
            if . == "assistant" or . == "bot" then "agent"
            elif . == "customer" or . == "user" then "persona"
            else . end),
          message: (.message // .content // .text // ""),
          timestamp_ms: (.timestamp_ms // .timestamp // 0)
        }
      ]
    }' "$input_file" > "$output_file"
    jq '.turns | length' "$output_file"
    return 0
  fi

  echo -e "  ${YELLOW}SKIP${NC}  Unrecognized JSON structure in: $(basename "$input_file")" >&2
  return 1
}

_parse_json_heuristic() {
  local input_file="$1"
  local output_file="$2"

  # Without jq: only handle files that already have a "turns" key.
  if grep -q '"turns"' "$input_file"; then
    cp "$input_file" "$output_file"
    count_turns_in_file "$output_file"
    return 0
  fi

  echo -e "  ${YELLOW}SKIP${NC}  jq required to parse non-standard JSON: $(basename "$input_file"). Install jq and retry." >&2
  return 1
}

# ─────────────────────────────────────────
# CSV PARSER
# Expects columns: speaker, message [, timestamp]
# First row is skipped if it contains the word "speaker" or "role".
# ─────────────────────────────────────────
parse_csv() {
  local input_file="$1"
  local output_file="$2"

  local turns_json="[]"
  local turn_count=0
  local timestamp=0
  local first_line=1
  local speaker_col=0
  local message_col=1
  local timestamp_col=-1

  while IFS=',' read -r -a cols || [[ "${#cols[@]}" -gt 0 ]]; do
    [[ "${#cols[@]}" -eq 0 ]] && continue

    if [[ "$first_line" -eq 1 ]]; then
      first_line=0
      local lower_first
      lower_first="$(echo "${cols[0]}" | tr '[:upper:]' '[:lower:]' | tr -d '"')"
      if [[ "$lower_first" == "speaker" || "$lower_first" == "role" ]]; then
        for i in "${!cols[@]}"; do
          local h
          h="$(echo "${cols[$i]}" | tr '[:upper:]' '[:lower:]' | tr -d '"')"
          case "$h" in
            speaker|role)    speaker_col=$i   ;;
            message|content) message_col=$i   ;;
            timestamp*)      timestamp_col=$i ;;
          esac
        done
        continue
      fi
    fi

    local raw_speaker="${cols[$speaker_col]:-}"
    local message="${cols[$message_col]:-}"

    raw_speaker="${raw_speaker#\"}" ; raw_speaker="${raw_speaker%\"}"
    message="${message#\"}"         ; message="${message%\"}"

    [[ -z "$raw_speaker" && -z "$message" ]] && continue

    if [[ "$timestamp_col" -ge 0 ]]; then
      local ts_raw="${cols[$timestamp_col]:-0}"
      ts_raw="${ts_raw#\"}" ; ts_raw="${ts_raw%\"}"
      timestamp="${ts_raw:-0}"
    fi

    local speaker
    case "$(echo "$raw_speaker" | tr '[:upper:]' '[:lower:]')" in
      agent|assistant|bot)      speaker="agent"   ;;
      persona|customer|user)    speaker="persona" ;;
      *)                        speaker="$(echo "$raw_speaker" | tr '[:upper:]' '[:lower:]')" ;;
    esac

    message="${message//\"/\\\"}"

    local obj
    obj=$(printf '{"speaker":"%s","message":"%s","timestamp_ms":%d}' \
      "$speaker" "$message" "$timestamp")

    if [[ "$turn_count" -eq 0 ]]; then
      turns_json="[${obj}]"
    else
      turns_json="${turns_json%]},${obj}]"
    fi

    turn_count=$((turn_count + 1))
    [[ "$timestamp_col" -lt 0 ]] && timestamp=$((timestamp + 1000))

  done < "$input_file"

  if [[ "$turn_count" -eq 0 ]]; then
    echo -e "  ${YELLOW}SKIP${NC}  No valid rows found in CSV: $(basename "$input_file")" >&2
    return 1
  fi

  printf '{\n  "turns": %s\n}\n' "$turns_json" > "$output_file"
  echo "$turn_count"
}

# ─────────────────────────────────────────
# IMPORT ONE FILE
# Returns: 0 on successful import, 1 on skip/error
# ─────────────────────────────────────────
import_file() {
  local input_file="$1"
  local filename
  filename="$(basename "$input_file")"
  local ext="${filename##*.}"
  ext="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"

  # Skip unsupported extensions silently
  if [[ ! "$ext" =~ ^(txt|json|csv)$ ]]; then
    return 1
  fi

  # Skip if already in the manifest
  if manifest_has_source "$filename"; then
    echo -e "  ${YELLOW}SKIP${NC}  Already in manifest: ${filename}"
    return 1
  fi

  local safe_name
  safe_name="$(sanitize_name "$filename")"
  local out_file="${TRANSCRIPTS_DIR}/${safe_name}.json"

  local turns=0
  local parse_ok=0

  case "$ext" in
    txt)  turns="$(parse_txt  "$input_file" "$out_file")" || parse_ok=1 ;;
    json) turns="$(parse_json "$input_file" "$out_file")" || parse_ok=1 ;;
    csv)  turns="$(parse_csv  "$input_file" "$out_file")" || parse_ok=1 ;;
  esac

  if [[ "$parse_ok" -ne 0 ]]; then
    return 1
  fi

  local new_id
  new_id="$(next_id)"
  local rel_transcript="transcripts/${safe_name}.json"

  manifest_append_entry "$new_id" "$filename" "$rel_transcript" "unknown" "$turns"

  echo -e "  ${GREEN}IMPORTED${NC}  ${BOLD}${new_id}${NC}  ${filename}  (${turns} turns) -> ${rel_transcript}"
  return 0
}

# ─────────────────────────────────────────
# COMMANDS
# ─────────────────────────────────────────

cmd_help() {
  echo ""
  echo -e "${BOLD}import-golden-set.sh${NC} — Import transcripts into the golden dataset"
  echo ""
  echo "Usage:"
  echo "  ./scripts/import-golden-set.sh <input_dir>    Import all .txt/.json/.csv files"
  echo "  ./scripts/import-golden-set.sh <input_file>   Import a single file"
  echo "  ./scripts/import-golden-set.sh --list         List current manifest entries"
  echo "  ./scripts/import-golden-set.sh --help         Show this help"
  echo ""
  echo "Input formats:"
  echo "  .txt    Lines in 'Speaker: message' format (Agent/Bot/Persona/Customer/User)"
  echo "  .json   {\"turns\":[...]} structure, or top-level array of message objects"
  echo "  .csv    Columns: speaker, message [, timestamp]"
  echo ""
  echo "Output:"
  echo "  datasets/golden/transcripts/<name>.json   Normalized transcript"
  echo "  datasets/golden/manifest.json             Updated manifest"
  echo ""
  echo "Expected scores:"
  echo "  Add manually to datasets/golden/expected/<golden-id>.json"
  echo ""
}

cmd_list() {
  load_manifest

  local count="${#MANIFEST_ENTRIES[@]}"

  echo ""
  echo -e "${BOLD}━━━ GOLDEN SET — ${count} entries ━━━${NC}"
  echo ""

  if [[ "$count" -eq 0 ]]; then
    echo -e "  ${YELLOW}(empty)${NC}  No entries yet. Import files to get started."
    echo ""
    return 0
  fi

  if [[ "$JQ_AVAILABLE" -eq 1 ]]; then
    jq -r '.entries[] | "  \(.id)  \(.source_file)  turns=\(.turns)  imported=\(.imported_at)  scenario=\(.scenario)"' \
      "$MANIFEST_FILE"
  else
    local i
    for (( i=0; i<count; i++ )); do
      echo "  ${MANIFEST_SOURCE_FILES[$i]}"
    done
  fi

  echo ""
  echo -e "  Manifest: ${CYAN}${MANIFEST_FILE}${NC}"
  echo ""
}

cmd_import() {
  local input="$1"

  mkdir -p "$TRANSCRIPTS_DIR"
  load_manifest

  local imported=0
  local skipped=0

  echo ""
  echo -e "${BOLD}━━━ GOLDEN SET IMPORT ━━━${NC}"
  echo ""

  if [[ -f "$input" ]]; then
    if import_file "$input"; then
      imported=$((imported + 1))
    else
      skipped=$((skipped + 1))
    fi

  elif [[ -d "$input" ]]; then
    local found=0
    while IFS= read -r -d $'\0' f; do
      found=$((found + 1))
      if import_file "$f"; then
        imported=$((imported + 1))
      else
        skipped=$((skipped + 1))
      fi
    done < <(find "$input" -maxdepth 1 -type f \( -iname "*.txt" -o -iname "*.json" -o -iname "*.csv" \) -print0 | sort -z)

    if [[ "$found" -eq 0 ]]; then
      echo -e "  ${YELLOW}WARN${NC}  No .txt/.json/.csv files found in: ${input}"
    fi

  else
    echo -e "  ${RED}ERROR${NC}  Not a file or directory: ${input}"
    exit 1
  fi

  if [[ "$imported" -gt 0 ]]; then
    save_manifest
  fi

  echo ""
  echo -e "${BOLD}━━━ SUMMARY ━━━${NC}"
  printf "  %-10s %s\n" "IMPORTED" "$(echo -e "${GREEN}${imported}${NC}")"
  printf "  %-10s %s\n" "SKIPPED"  "$(echo -e "${YELLOW}${skipped}${NC}")"
  echo ""

  if [[ "$imported" -gt 0 ]]; then
    echo -e "  Manifest: ${CYAN}${MANIFEST_FILE}${NC}"
    echo -e "  Next step: add expected scores to ${CYAN}${GOLDEN_DIR}/expected/${NC}"
    echo ""
  fi
}

# ─────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────
if [[ $# -eq 0 ]]; then
  cmd_help
  exit 0
fi

case "$1" in
  --help|-h)
    cmd_help
    exit 0
    ;;
  --list|-l)
    cmd_list
    exit 0
    ;;
  -*)
    echo -e "${RED}ERROR${NC}  Unknown option: $1"
    echo "Run with --help for usage."
    exit 1
    ;;
  *)
    cmd_import "$1"
    ;;
esac
