# End-to-End Testing Workflow Checklist

**AI Agent Testing Dashboard** — Complete guide from setup to results review.

*Last reviewed: 2026-02-16*

---

## Pre-Flight Checks

### Environment Variables

Required `.env.local` variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://dlozxirsmrbriuklgcxq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
N8N_SECRET=<your-shared-secret>
N8N_BASE_URL=https://primary-production-1d87.up.railway.app
N8N_TEST_RUNNER_WEBHOOK=https://primary-production-1d87.up.railway.app/webhook/<id>
N8N_PERSONA_GENERATOR_WEBHOOK=https://primary-production-1d87.up.railway.app/webhook/personas-generator
N8N_EVALUATOR_WEBHOOK=https://primary-production-1d87.up.railway.app/webhook/evaluator
```

**How to verify:**
- [ ] `.env.local` exists in project root
- [ ] Open http://localhost:3000/settings → "Database" tab shows "Connected" badge

---

### Database State Requirements

#### 1. prompt_versions Table

Minimum one prompt version with valid data:

```sql
SELECT id, prompt_name, version, status FROM prompt_versions LIMIT 1;
```

**Verification in UI:**
- [ ] Navigate to http://localhost:3000/test-launcher
- [ ] "Prompt Version" dropdown shows at least one option

#### 2. personas Table

Minimum 1 **validated** persona per prompt:

```sql
SELECT id, created_for_prompt, validation_status FROM personas
WHERE created_for_prompt = 'Your Prompt Name' AND validation_status = 'validated';
```

**Common issue:** "No validated personas found for this prompt."

**Fix:**
```sql
UPDATE personas SET validation_status = 'validated'
WHERE created_for_prompt = 'Your Prompt Name' AND validation_status = 'pending';
```

#### 3. workflow_configs Table

```sql
SELECT workflow_type, webhook_url, is_active FROM workflow_configs;
```

**Required rows:**
- `test_runner` — MUST be active, webhook_url must be set
- `evaluator` — Should be active, webhook_url required

**How to check in UI:**
- [ ] Navigate to http://localhost:3000/settings → "Workflows" tab
- [ ] `test_runner` and `evaluator` must have "Active" toggle ON and "success" badge

---

### n8n Webhook Configuration

1. Open n8n: https://primary-production-1d87.up.railway.app
2. Find workflow "Test RUNNER" (ID: XmpBhcUxsRpxAYPN)
3. Copy the trigger webhook URL
4. In dashboard Settings → Workflows:
   - [ ] Paste into "test_runner" webhook_url field
   - [ ] Click "Test" → wait for green "success" badge
   - [ ] Click "Save"
5. Repeat for "Evaluator" (ID: 202JEX5zm3VlrUT8)

---

## Step-by-Step: Run Your First Test

### Step 1: Open Test Launcher
Navigate to **http://localhost:3000/test-launcher**

### Step 2: Select a Prompt Version
Click dropdown → select prompt (e.g., "Medical Audit Assistant v3.0")
- [ ] "Selected Prompt Summary" card appears showing personas count

### Step 3: Select Tool Scenario
Choose one of 4 scenarios (see below). **Recommended for first test: Happy Path**

### Step 4: Select Test Mode
- **Single Run** (recommended first time) — fast, immediate results
- **Full Cycle** — pauses for human review

### Step 5: Click "Launch Test"
- [ ] Button shows spinner
- [ ] "Active Test Run Monitor" card appears below

### Step 6: Monitor Progress
- Status: pending → running → evaluating → completed
- Polls every 5 seconds automatically
- **Typical duration:** 3-7 min (1 persona), 5-15 min (4 personas)

### Step 7: View Results
Click **"View Results"** → navigates to Conversations page filtered by test run

---

## Test Scenarios Available

| ID | Name | What it tests | Expected Score |
|----|------|---------------|----------------|
| `happy_path` | Happy Path | Baseline positive flow, all tools work | 8+/10 |
| `calendar_full` | Calendario Pieno | No availability, graceful degradation | 6-8/10 |
| `booking_fails` | Prenotazione Fallisce | System error handling and recovery | 7-9/10 |
| `partial_availability` | Disponibilita Parziale | Customer preferences vs limited slots | 7-9/10 |

---

## Test Run Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| **pending** | Created, waiting to start | Wait |
| **running** | Battles in progress | Wait, check n8n logs |
| **battles_completed** | Battles done, evaluator starting | Wait |
| **evaluating** | Scoring results | Wait |
| **completed** | Results ready | Click "View Results" |
| **failed** | Error during test | Check error message |
| **aborted** | User killed test | Re-launch if needed |
| **awaiting_review** | Full cycle mode, waiting for approval | Review → approve/reject |

---

## Viewing Results

### Conversations Page (`/conversations?test_run_id=RUN-XXXXX`)
- Left panel: Conversation list with score and outcome
- Right panel: Full transcript + evaluation breakdown

### Dashboard Overview (`/`)
- KPI Cards: Total tests, avg score, success rate
- Personas Heatmap: Performance grid
- Test Runs Distribution: Recent outcomes

### Score Interpretation
- **8.0 - 10.0**: Success (green)
- **6.0 - 7.9**: Partial (yellow)
- **0 - 5.9**: Failure (red)

---

## Troubleshooting

### 1. "View does not exist"
**Cause:** Database migrations not applied
```bash
cd supabase && supabase migration up
```

### 2. "No validated personas found"
**Cause:** All personas have `validation_status = 'pending'`
```sql
UPDATE personas SET validation_status = 'validated'
WHERE created_for_prompt = 'Your Prompt Name';
```

### 3. Test stuck in "running" (> 20 min)
1. Check n8n execution: https://primary-production-1d87.up.railway.app
2. Open Test RUNNER → Executions tab
3. Look for errors in Battle Agent or HTTP Request nodes
4. Click "Abort Test" in dashboard

### 4. Webhook "failed" in Settings
1. Verify n8n is running (open URL in browser)
2. Copy webhook URL from n8n trigger node
3. Paste in Settings → Test → Save

### 5. "callback_url unreachable"
**Cause:** n8n (Railway) can't reach localhost
**Fix:** Use ngrok for local dev:
```bash
ngrok http 3000
# Update callback_url with ngrok HTTPS URL
```

---

## Known Limitations

| Item | Status | Workaround |
|------|--------|------------|
| Kill switch mid-conversation (REQ-5.6) | Not implemented | Test finishes naturally or times out |
| x-n8n-secret validation (REQ-5.7) | Not enforced | Solo user, acceptable risk |
| Tool mocking by scenario (REQ-5.8) | Partial | Happy Path works, edge cases may not |
| Dynamic evaluator criteria (E3-E5) | Hardcoded only | Use default evaluator |

---

## Quick Reference: Manual API Testing

```bash
# Launch test
curl -X POST http://localhost:3000/api/test-runs \
  -H "Content-Type: application/json" \
  -d '{"prompt_version_id": "UUID", "mode": "single", "tool_scenario_id": "happy_path"}'

# Check status
curl http://localhost:3000/api/test-runs/TEST-RUN-UUID

# Abort test
curl -X POST http://localhost:3000/api/test-runs/TEST-RUN-UUID/abort
```

---

## Best Practices

1. **Start small**: 1 prompt + 1 scenario + Single Run
2. **Monitor n8n logs** for early warning of issues
3. **Check database directly** if UI doesn't show results
4. **Iterate on prompts** based on evaluation scores
5. **Use Happy Path first**, then edge cases

---

*Document Version: 1.0 — 2026-02-16*
