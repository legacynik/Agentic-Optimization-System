# BMAD-METHOD Agents Reference

This project uses BMAD-METHOD for structured workflows.

## Quick Start

```bash
*workflow-init    # Start guided workflow selection
```

## Available Agents

| Agent | Command | Purpose |
|-------|---------|---------|
| Project Manager | `*pm` | Requirements, priorities, scope |
| Architect | `*architect` | System design, tech decisions |
| Developer | `*dev` | Implementation, coding |
| UX Specialist | `*ux` | User experience, interfaces |
| QA Engineer | `*qa` | Testing, quality assurance |
| Scrum Master | `*scrum` | Sprint planning, blockers |
| Security Expert | `*security` | Security review, threats |
| DevOps | `*devops` | CI/CD, infrastructure |
| Data Engineer | `*data` | Database, data pipelines |
| Documentation | `*doc` | Technical writing |

## Workflows

| Type | Command | Duration | Use For |
|------|---------|----------|---------|
| Quick | `*workflow-quick` | ~5 min | Bug fixes, hotfixes |
| Standard | `*workflow-standard` | ~15 min | Features, refactoring |
| Enterprise | `*workflow-enterprise` | ~30 min | Large features, compliance |

## Example Usage

### Starting a new feature:
```
*pm "Define requirements for user authentication"
*architect "Design auth system with JWT"
*dev "Implement login endpoint"
*qa "Create test plan for auth"
```

### Bug fix workflow:
```
*workflow-quick
# Follow guided steps
```

## Integration Notes

BMAD agents automatically follow Claude Bootstrap skills:
- TDD-first (write tests before code)
- Security patterns (no hardcoded secrets)
- Code review before commit
