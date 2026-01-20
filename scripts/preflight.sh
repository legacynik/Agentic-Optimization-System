#!/bin/bash
#
# Preflight Check - Esegui PRIMA di ogni commit/merge
# Le regole in CLAUDE.md verranno ignorate. Questo script BLOCCA.
#
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

echo "━━━ PREFLIGHT CHECK ━━━"
echo ""

# ─────────────────────────────────────────
# 1. SECRETS CHECK
# ─────────────────────────────────────────
echo -n "Checking for hardcoded secrets... "
if grep -rE "(password|secret|api_key|apikey|token)\s*=\s*['\"][^'\"]+['\"]" --include="*.py" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v ".env" | grep -v "example" | grep -v "test" | head -5; then
    echo -e "${RED}FAIL${NC} - Possibili secrets hardcoded trovati"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}OK${NC}"
fi

# ─────────────────────────────────────────
# 2. TODO/FIXME CHECK
# ─────────────────────────────────────────
echo -n "Checking for unresolved TODOs... "
TODO_COUNT=$(grep -rE "(TODO|FIXME|XXX|HACK):" --include="*.py" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}WARN${NC} - $TODO_COUNT TODOs trovati (considera di risolverli)"
else
    echo -e "${GREEN}OK${NC} ($TODO_COUNT TODOs)"
fi

# ─────────────────────────────────────────
# 3. TYPE ERRORS (TypeScript)
# ─────────────────────────────────────────
if [ -f "tsconfig.json" ]; then
    echo -n "Checking TypeScript types... "
    if npx tsc --noEmit 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL${NC} - Type errors"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ─────────────────────────────────────────
# 4. LINT (se configurato)
# ─────────────────────────────────────────
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
    echo -n "Running ESLint... "
    if npx eslint . --quiet 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL${NC} - Lint errors"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ -f "pyproject.toml" ] && grep -q "ruff" pyproject.toml 2>/dev/null; then
    echo -n "Running Ruff... "
    if ruff check . 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL${NC} - Lint errors"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ─────────────────────────────────────────
# 5. CONSOLE.LOG / PRINT DEBUG
# ─────────────────────────────────────────
echo -n "Checking for debug statements... "
DEBUG_COUNT=$(grep -rE "(console\.log|print\(|debugger)" --include="*.py" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v "logger" | grep -v "test" | wc -l | tr -d ' ')
if [ "$DEBUG_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}WARN${NC} - $DEBUG_COUNT debug statements (rimuovi prima di prod)"
else
    echo -e "${GREEN}OK${NC}"
fi

# ─────────────────────────────────────────
# 6. ENV FILE CHECK
# ─────────────────────────────────────────
echo -n "Checking .env files... "
if [ -f ".env" ] && ! [ -f ".env.example" ]; then
    echo -e "${YELLOW}WARN${NC} - .env esiste ma manca .env.example"
else
    echo -e "${GREEN}OK${NC}"
fi

# ─────────────────────────────────────────
# 7. DUPLICATE CODE (basic)
# ─────────────────────────────────────────
echo -n "Checking for obvious duplicates... "
# Cerca funzioni con nomi molto simili
DUPE_FUNCS=$(grep -rohE "(function|def|const)\s+\w+" --include="*.py" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | sort | uniq -d | wc -l | tr -d ' ')
if [ "$DUPE_FUNCS" -gt 3 ]; then
    echo -e "${YELLOW}WARN${NC} - Possibili duplicati ($DUPE_FUNCS)"
else
    echo -e "${GREEN}OK${NC}"
fi

# ─────────────────────────────────────────
# RISULTATO
# ─────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}PREFLIGHT FAILED${NC} - $ERRORS errori da risolvere"
    exit 1
else
    echo -e "${GREEN}PREFLIGHT PASSED${NC}"
    exit 0
fi
