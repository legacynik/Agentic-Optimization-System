# /ralph-spec Command

Invokes Ralph Loop with auto-generated prompt from a SPEC file.

## Usage

```
/ralph-spec <phase-number>
/ralph-spec <spec-file-path>
```

## Examples

```
/ralph-spec 5
/ralph-spec phase-5-n8n.md
/ralph-spec _project_specs/specs/phase-5-n8n.md
```

## Execution Steps

When invoked, Claude MUST:

### 1. Resolve Spec File
```
If argument is number (e.g., "5"):
  → Look for: _project_specs/specs/phase-{N}-*.md

If argument is filename:
  → Look for: _project_specs/specs/{filename}

If argument is full path:
  → Use directly
```

### 2. Read and Parse Spec
```
1. Read the spec file completely
2. Parse YAML frontmatter for metadata
3. Extract sections:
   - ## Requirements (pending items only, marked [ ])
   - ## Acceptance Criteria (pending items only)
   - ## Manual Test Script
   - ## Pending Implementation Details
```

### 3. Generate Ralph Loop Prompt

```markdown
## Context Files
- _project_specs/PRD-v3-index.md (read for overview)
- [spec-file-path] (FULL SPEC - primary context)

## Task: Complete Phase {N} - {phase_name}

### Pending Requirements
[Extract all unchecked items from ## Requirements]

### Pending Acceptance Criteria
[Extract all unchecked items from ## Acceptance Criteria]

### Implementation Details
[Extract from ## Pending Implementation Details]

### TDD Workflow
1. For each pending requirement:
   a. Write failing test if applicable
   b. Implement the change
   c. Verify test passes
2. Run lint + typecheck
3. Update spec file: mark completed items [x]

### Completion Criteria
- [ ] All requirements marked [x]
- [ ] All acceptance criteria marked [x]
- [ ] Lint clean
- [ ] Typecheck clean
- [ ] Manual test steps documented with Expected/Actual

### Exit Condition
<promise>PHASE {N} COMPLETE</promise>
```

### 4. Invoke Ralph Loop

```
/ralph-loop "[generated-prompt]" --completion-promise "PHASE {N} COMPLETE" --max-iterations 25
```

## Output

After Ralph Loop completes:
1. Update spec file with completed items
2. Update PRD-v3-index.md status if all done
3. Report summary to user

## Notes

- This command focuses on PENDING items only
- Already completed items ([x]) are skipped
- If spec has 0 pending items, inform user and skip Ralph Loop
- Always read PRD-v3-index.md for project context
