# BMAD-METHOD Agents Reference

This project uses BMAD-METHOD for structured workflows.

## Available Agents (invoke with *agent-name)

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| *pm | Project Manager | Define requirements, prioritize tasks, create roadmaps |
| *architect | System Architect | Design systems, make tech decisions, define architecture |
| *dev | Developer | Implement features, write code, fix bugs |
| *ux | UX Specialist | Design interfaces, user flows, improve usability |
| *qa | QA Engineer | Test planning, quality assurance, bug tracking |
| *scrum | Scrum Master | Sprint planning, remove blockers, facilitate meetings |
| *security | Security Expert | Security review, threat modeling, vulnerability assessment |
| *devops | DevOps Engineer | CI/CD, deployment, infrastructure, monitoring |
| *data | Data Engineer | Database design, data pipelines, analytics |
| *doc | Documentation | Technical writing, API docs, user guides |

## Workflows

| Workflow | Time | Use For |
|----------|------|---------|
| *workflow-quick | ~5 min | Bug fixes, small features, quick updates |
| *workflow-standard | ~15 min | New features, refactoring, standard development |
| *workflow-enterprise | ~30 min | Large features, compliance, architecture changes |

## Usage Examples

```bash
# Start any workflow
*workflow-init

# Call specific agent
*architect "Design the authentication system"

# Chain agents for complex tasks
*pm → *architect → *dev

# Quick bug fix
*workflow-quick → *qa → *dev
```

## Integration with Claude Bootstrap

BMAD agents follow Claude Bootstrap skills automatically:
- TDD-first development (base.md)
- Security patterns (security.md)
- Code review before commit (code-review.md)
- Session management (session-management.md)

## Best Practices

1. **Start with workflow selection**: Use `*workflow-init` to choose the right workflow
2. **Chain agents logically**: PM → Architect → Dev → QA
3. **Use specialists**: Call *security for auth, *data for database design
4. **Document decisions**: Use *doc to capture architectural decisions
5. **Regular QA**: Include *qa in your workflow for quality assurance

## Common Patterns

### Feature Development
```
*workflow-standard
*pm "Define user story"
*architect "Design solution"
*dev "Implement feature"
*qa "Test implementation"
*doc "Update documentation"
```

### Bug Fix
```
*workflow-quick
*qa "Reproduce bug"
*dev "Fix issue"
*qa "Verify fix"
```

### Architecture Review
```
*workflow-enterprise
*architect "Review current architecture"
*security "Identify vulnerabilities"
*devops "Plan deployment strategy"
```