#!/bin/bash

# Verify AI Development Tooling
# Quick check that all integrations are working

echo "🔍 Verifying AI Development Tools..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

errors=0

# Function to check command
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((errors++))
        return 1
    fi
}

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((errors++))
        return 1
    fi
}

# Function to check directory
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((errors++))
        return 1
    fi
}

echo "Essential Tools:"
check_command node "Node.js"
check_command pnpm "pnpm package manager"
check_command git "Git version control"

echo ""
echo "Claude Bootstrap:"
check_dir ~/.claude-bootstrap "Bootstrap installation"
check_dir .claude/skills "Project skills"
check_file .claude/skills/base/SKILL.md "Base skill"
check_file .claude/skills/security/SKILL.md "Security skill"

echo ""
echo "BMAD-METHOD:"
check_file .claude/agents/bmad-agents.md "BMAD agents reference"

echo ""
echo "Project Structure:"
check_dir _project_specs "Project specifications"
check_dir docs "Documentation"
check_file CLAUDE.md "Project instructions"

echo ""
echo "Environment:"
check_file .env.local "Environment variables"
check_file package.json "Package configuration"

echo ""
echo "═══════════════════════════════════════"
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Ready for AI-native development.${NC}"
    echo ""
    echo "Quick commands:"
    echo "  pnpm dev          - Start development server"
    echo "  *workflow-init    - Start BMAD workflow"
    echo "  /code-review      - Review code before commit"
else
    echo -e "${YELLOW}Found $errors issues. Run setup script to fix:${NC}"
    echo "  ./scripts/setup-ai-integrations.sh"
fi
echo "═══════════════════════════════════════"