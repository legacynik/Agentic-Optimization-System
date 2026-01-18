#!/bin/bash
set -e

# Full Stack AI Development Setup Script
# Integrates Claude Bootstrap + BMAD-METHOD (Archon disabled)

echo "🚀 Setting up Full Stack AI Development..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Claude Bootstrap
echo "📦 Checking Claude Bootstrap..."
if [ -d ~/.claude-bootstrap ]; then
    echo -e "${GREEN}✓ Claude Bootstrap installed${NC}"

    # Validate installation
    if [ -f ~/.claude-bootstrap/tests/validate-structure.sh ]; then
        echo "  Validating structure..."
        ~/.claude-bootstrap/tests/validate-structure.sh --quick 2>/dev/null || echo "  Validation skipped"
    fi

    # Check if skills are copied to project
    if [ -d .claude/skills ]; then
        skill_count=$(ls -1 .claude/skills | wc -l)
        echo -e "${GREEN}✓ Skills loaded: $skill_count directories${NC}"
    else
        echo -e "${YELLOW}⚠ No skills in project. Copy from ~/.claude-bootstrap/skills/${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Claude Bootstrap not installed${NC}"
    echo "  To install:"
    echo "    git clone https://github.com/alinaqi/claude-bootstrap.git ~/.claude-bootstrap"
    echo "    cd ~/.claude-bootstrap && ./install.sh"
fi

# 2. BMAD-METHOD
echo ""
echo "📦 Checking BMAD-METHOD..."
if command -v node &> /dev/null; then
    node_ver=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_ver" -ge 20 ]; then
        echo -e "${GREEN}✓ Node.js $node_ver ready for BMAD${NC}"

        # Check if BMAD agents are documented
        if [ -f .claude/agents/bmad-agents.md ]; then
            echo -e "${GREEN}✓ BMAD agents reference available${NC}"
        else
            echo -e "${YELLOW}⚠ BMAD agents reference missing${NC}"
            echo "  Run: npx bmad-method@alpha install"
        fi
    else
        echo -e "${YELLOW}⚠ Node.js 20+ required for BMAD (current: $node_ver)${NC}"
        echo "  Run: nvm install 20 && nvm use 20"
    fi
else
    echo -e "${YELLOW}⚠ Node.js not found${NC}"
fi

# 3. Archon (Disabled)
echo ""
echo "📦 Archon Status..."
echo -e "${BLUE}ℹ Archon is intentionally disabled for this project${NC}"
echo "  Documentation preserved at: .claude/agents/archon-integration.md"

# 4. Project Structure Check
echo ""
echo "📁 Checking project structure..."
dirs_to_check=(
    ".claude/skills"
    ".claude/agents"
    "_project_specs/features"
    "_project_specs/todos"
    "_project_specs/session"
    "docs"
    "scripts"
)

missing_dirs=()
for dir in "${dirs_to_check[@]}"; do
    if [ ! -d "$dir" ]; then
        missing_dirs+=("$dir")
    fi
done

if [ ${#missing_dirs[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All project directories present${NC}"
else
    echo -e "${YELLOW}⚠ Missing directories:${NC}"
    for dir in "${missing_dirs[@]}"; do
        echo "    - $dir"
    done
    echo "  Creating missing directories..."
    for dir in "${missing_dirs[@]}"; do
        mkdir -p "$dir"
    done
    echo -e "${GREEN}✓ Directories created${NC}"
fi

# 5. Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}                 FULL STACK AI DEV STATUS${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Claude Bootstrap status
if [ -d ~/.claude-bootstrap ] && [ -d .claude/skills ]; then
    echo "✅ Claude Bootstrap: Ready"
    echo "   - Skills in: .claude/skills/"
    echo "   - Commands: /code-review, /initialize-project"
else
    echo "⚠️  Claude Bootstrap: Needs setup"
fi

# BMAD status
if [ -f .claude/agents/bmad-agents.md ]; then
    echo "✅ BMAD-METHOD: Configured"
    echo "   - Agents: *pm, *architect, *dev, *qa, etc."
    echo "   - Start: *workflow-init"
else
    echo "⚠️  BMAD-METHOD: Needs installation"
fi

# Archon status
echo "🔒 Archon: Intentionally disabled"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "HOW THEY WORK TOGETHER:"
echo ""
echo "  ┌─────────────┐     ┌─────────────┐"
echo "  │  BOOTSTRAP  │     │    BMAD     │"
echo "  │   (Rules)   │     │  (Agents)   │"
echo "  └──────┬──────┘     └──────┬──────┘"
echo "         │                   │"
echo "         └─────────┬─────────┘"
echo "                   ▼"
echo "           ┌─────────────┐"
echo "           │ CLAUDE CODE │"
echo "           │  AI-Native  │"
echo "           │ Development │"
echo "           └─────────────┘"
echo ""
echo "WORKFLOW:"
echo "  1. *workflow-init → BMAD guides planning"
echo "  2. Read skills → Apply Bootstrap patterns"
echo "  3. Code with TDD → Follow security rules"
echo "  4. /code-review → Before every commit"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Open Claude Code"
echo "  2. Read CLAUDE.md for full instructions"
echo "  3. Start with: *workflow-init"