#!/bin/bash

# Full Stack AI Agent Dashboard Setup Script
# This script sets up the complete development environment for the AI Agent Testing Dashboard

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup function
main() {
    print_status "Starting AI Agent Dashboard Full Stack Setup..."

    # Step 1: Check prerequisites
    print_status "Checking prerequisites..."

    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 22.x or later"
        exit 1
    fi

    if ! command_exists pnpm; then
        print_warning "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
        print_success "pnpm installed successfully"
    fi

    # Step 2: Install dependencies
    print_status "Installing project dependencies..."
    pnpm install
    print_success "Dependencies installed"

    # Step 3: Setup environment variables
    print_status "Setting up environment variables..."

    if [ ! -f .env.local ]; then
        cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dlozxirsmrbriuklgcxq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsb3p4aXJzbXJicml1a2xnY3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTE5MDksImV4cCI6MjA2NjI2NzkwOX0.SKIi4wGroLMcZ0q9VRLhTS3pUTHGq-9j3OGEB4Hf4cc

# Optional: Add any additional environment variables here
EOF
        print_success "Created .env.local with Supabase configuration"
    else
        print_warning ".env.local already exists - skipping"
    fi

    # Step 4: Check Supabase CLI (optional)
    if command_exists supabase; then
        print_status "Supabase CLI detected"

        # Check if user wants to setup local Supabase
        read -p "Do you want to set up local Supabase development? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_local_supabase
        fi
    else
        print_warning "Supabase CLI not installed. Skipping local development setup"
        print_status "You can install it later with: brew install supabase/tap/supabase"
    fi

    # Step 5: Create necessary directories
    print_status "Creating project directories..."
    mkdir -p app/conversations
    mkdir -p components/ui
    mkdir -p lib
    mkdir -p public
    mkdir -p styles
    print_success "Project directories created"

    # Step 6: Run initial build to check for errors
    print_status "Running initial build check..."
    pnpm run build || {
        print_warning "Build failed - this might be expected if components are missing"
        print_status "You can fix build errors and run 'pnpm run build' again"
    }

    # Step 7: Setup git hooks (optional)
    if [ -d .git ]; then
        setup_git_hooks
    fi

    # Step 8: Final steps
    print_success "🎉 Setup completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "  1. Start the development server: pnpm dev"
    echo "  2. Open http://localhost:3000 in your browser"
    echo "  3. Check the dashboard at http://localhost:3000"
    echo "  4. View conversations at http://localhost:3000/conversations"
    echo ""
    print_status "Useful commands:"
    echo "  - pnpm dev        : Start development server"
    echo "  - pnpm build      : Build for production"
    echo "  - pnpm start      : Start production server"
    echo "  - pnpm lint       : Run linter"
    echo ""

    # Ask if user wants to start the dev server
    read -p "Do you want to start the development server now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Starting development server..."
        pnpm dev
    fi
}

# Function to setup local Supabase
setup_local_supabase() {
    print_status "Setting up local Supabase..."

    # Initialize Supabase if not already initialized
    if [ ! -f supabase/config.toml ]; then
        supabase init
        print_success "Supabase initialized"
    fi

    # Link to remote project
    print_status "Linking to remote Supabase project..."
    supabase link --project-ref dlozxirsmrbriuklgcxq || {
        print_warning "Failed to link project - you may need to authenticate first"
        print_status "Run: supabase login"
    }

    # Start local Supabase
    print_status "Starting local Supabase services..."
    supabase start

    # Display local URLs
    print_success "Local Supabase is running!"
    echo "  - API URL: http://localhost:54321"
    echo "  - DB URL: postgresql://postgres:postgres@localhost:54322/postgres"
    echo "  - Studio URL: http://localhost:54323"
    echo ""

    # Update .env.local for local development
    read -p "Do you want to update .env.local for local development? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.local .env.local.backup
        cat > .env.local.development << 'EOF'
# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(supabase status --output json | jq -r .api.anon_key)

# Remote Supabase Configuration (backup)
# NEXT_PUBLIC_SUPABASE_URL=https://dlozxirsmrbriuklgcxq.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF
        print_success "Created .env.local.development for local testing"
        print_status "Original .env.local backed up to .env.local.backup"
    fi
}

# Function to setup git hooks
setup_git_hooks() {
    print_status "Setting up git hooks..."

    # Create pre-commit hook for linting
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook to run linting
echo "Running pre-commit checks..."
pnpm lint || {
    echo "Linting failed. Please fix errors before committing."
    exit 1
}
EOF

    chmod +x .git/hooks/pre-commit
    print_success "Git hooks configured"
}

# Function to check system requirements
check_system_requirements() {
    print_status "Checking system requirements..."

    # Check Node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required (found v$NODE_VERSION)"
        exit 1
    fi

    # Check available disk space (require at least 1GB)
    if command_exists df; then
        AVAILABLE_SPACE=$(df . | awk 'NR==2 {print $4}')
        if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then
            print_warning "Low disk space available"
        fi
    fi

    print_success "System requirements satisfied"
}

# Function to create sample data
create_sample_data() {
    print_status "Creating sample data file..."

    cat > lib/sample-data.ts << 'EOF'
// Sample data for testing without database connection
export const samplePersonasPerformance = [
  {
    conversationid: 1,
    personaid: "tech-savvy-user",
    persona_description: "A technically proficient user familiar with AI tools",
    persona_category: "Technical",
    testrunid: "test-001",
    promptversionid: "v1.0",
    agentversion: "agent-v2.1",
    testrun_notes: "Initial baseline test",
    avg_score: 8.5,
    avg_turns: 12,
    test_date: new Date().toISOString(),
    all_criteria_details: [
      { criteria_name: "Accuracy", score: 9, conversation_id: 1 },
      { criteria_name: "Relevance", score: 8, conversation_id: 1 },
      { criteria_name: "Completeness", score: 8, conversation_id: 1 }
    ],
    conversations_summary: [
      {
        conversationid: 1,
        outcome: "success" as const,
        score: 8.5,
        summary: "User successfully completed the task with minimal assistance",
        human_notes: "Good interaction flow",
        turns: 12
      }
    ],
    conversations_transcripts: JSON.stringify([
      { role: "user", content: "How do I analyze test results?" },
      { role: "assistant", content: "You can view test results in the dashboard..." }
    ])
  }
];
EOF

    print_success "Sample data file created"
}

# Enhanced error handling
trap 'handle_error $? $LINENO' ERR

handle_error() {
    print_error "An error occurred on line $2 with exit code $1"
    print_status "Setup failed. Please check the error messages above."
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-supabase)
            SKIP_SUPABASE=true
            shift
            ;;
        --local-only)
            LOCAL_ONLY=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --skip-supabase  Skip Supabase setup"
            echo "  --local-only     Setup for local development only"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run the main setup
check_system_requirements
main

# End of script