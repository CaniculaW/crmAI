# V4 AI Sales Copilot Design

Date: 2026-07-06

## 1. Product Positioning

V4 is not a simple AI data entry clerk. V4 is the CRM's AI sales copilot: it helps sales users record facts, understand opportunities, plan visits, choose communication approaches, and generate weekly reporting from real CRM context.

Text-based data entry remains the first interaction, but its purpose is to feed a broader sales-assistance loop:

```text
Sales facts and CRM context
-> AI understands customer, contact, opportunity, activity, contract, receivable, and risk signals
-> AI generates drafts, analysis, weekly reports, visit plans, and communication recommendations
-> Sales user confirms or adjusts
-> CRM records, plans, and reports are updated with audit trail
```

## 2. Confirmed Scope

V4 does:

- Text input for accounts, contacts, opportunities, commercial leads, and sales activities.
- Treat "lead" as the existing opportunity stage `lead` / `商业线索`; V4 does not create a standalone lead pool.
- Generate confirmed CRM drafts for account, contact, opportunity, and activity data.
- Generate personal weekly reports and opportunity weekly progress summaries from sales activities and opportunity context.
- Generate opportunity analysis: stage judgment, relationship gaps, risk signals, blockers, next-best actions, and win-probability drivers.
- Generate visit plan suggestions: visit objective, target attendees, agenda, preparation materials, expected outcomes, and follow-up tasks.
- Recommend communication method and tone based on contact role, attitude, influence, relationship heat, recent feedback, and opportunity stage.
- Keep human confirmation before writing CRM data, generated plans, or reusable report content.
- Record AI write logs and recommendation logs for traceability.
- Respect existing role permissions, target object permissions, and data scope.

V4 does not do:

- Voice transcription.
- Attachment parsing.
- Enterprise WeChat, DingTalk, Feishu, email, or meeting-system integration.
- Standalone lead pool.
- AI direct update of contract, invoice, payment, or reconciliation records.
- AI direct opportunity stage change beyond creating an opportunity in the `lead` stage.
- Automatic write without human confirmation.
- Automatic sending of messages to customers.
- Black-box scoring without showing the evidence used for the recommendation.

## 3. Product Principles

1. **Assist judgment, not only entry.** The assistant must help the sales user decide what to do next.
2. **Evidence first.** Every analysis and recommendation must show the CRM facts it used.
3. **Human control.** AI can draft, recommend, and summarize; humans confirm writes and customer-facing actions.
4. **Sales workflow native.** Outputs must connect back to accounts, contacts, opportunities, activities, weekly progress, and dashboards.
5. **Traceable AI.** Drafts, recommendations, confirmations, and writes must be auditable.

## 4. User Roles

| Role | V4 usage |
|---|---|
| Sales user | Submit text, confirm drafts, generate weekly report, analyze own opportunities, plan visits, get communication suggestions. |
| Sales manager | Review team opportunity analysis, inspect weekly summaries, identify risks and coaching points. |
| Admin | Configure permissions, inspect AI logs and audit trail. |
| Executive | Read management-level summaries through V3 dashboards and weekly reports, not operate drafts. |

## 5. Navigation

Add a top-level menu item: `AI助手`.

Child pages:

| Page | Route | Purpose |
|---|---|---|
| AI Workbench | `/ai-assistant` | Main assistant surface: text input, current suggestions, draft cards, report and plan entry points. |
| Draft Confirmation | `/ai-assistant/drafts` | Review, edit, supplement, confirm, or reject AI-created CRM drafts. |
| Weekly Report | `/ai-assistant/weekly-report` | Generate and review personal weekly report and opportunity weekly progress content. |
| Opportunity Analysis | `/ai-assistant/opportunities` | Analyze selected opportunities and produce risks, blockers, next actions, and evidence. |
| Visit Planner | `/ai-assistant/visit-plans` | Generate visit objectives, agenda, attendee strategy, preparation checklist, and follow-up tasks. |
| Communication Advisor | `/ai-assistant/communication` | Recommend communication method, tone, message focus, and escalation path for contacts. |
| AI Logs | `/ai-assistant/logs` | Inspect write logs, recommendation logs, source evidence, operator, result, and failure reason. |

The first screen should be a real AI Workbench, not a landing page.

## 6. Core Business Flows

### 6.1 Text Input To CRM Drafts

```text
User pastes text
-> backend stores ai_input_records
-> extraction service creates ai_extraction_drafts
-> each draft is classified as account/contact/opportunity/activity
-> matcher links existing account/contact/opportunity when confidence is high
-> validator marks missing required fields and conflicts
-> user confirms, edits, or rejects
-> backend calls existing Account/Contact/Opportunity/Activity services
-> write result is stored in ai_write_logs
```

### 6.2 Weekly Report Generation

```text
User chooses week and scope
-> AI reads completed activities, planned activities, opportunity changes, risks, and next steps
-> AI generates weekly summary, opportunity progress, risk list, next-week plan, and management highlights
-> user edits and confirms report
-> confirmed content is retained as weekly report evidence and can link back to weekly progress
```

Weekly report sections:

- This week's completed customer interactions.
- Opportunity progress by account and opportunity.
- Key risks and blockers.
- Customer feedback and relationship changes.
- Next week's visit and follow-up plan.
- Management support needed.

### 6.3 Opportunity Analysis

```text
User selects opportunity
-> AI reads opportunity, account, contacts, activities, solution/contract context, receivable risks when present, and V3 risk signals
-> AI identifies stage health, relationship gaps, blockers, risk causes, next-best actions, and evidence
-> user can convert recommendations into activity drafts or visit plans
```

Opportunity analysis output:

- Stage judgment: whether current stage matches available evidence.
- Relationship map gap: missing key decision maker, influencer, user-side sponsor, or blocker.
- Risk explanation: stalled, high-risk feedback, missing next step, amount/date uncertainty.
- Win-probability drivers: positive and negative factors, not a black-box score.
- Next-best actions: concrete tasks with owner, timing, and expected outcome.
- Evidence: linked activities, contacts, opportunity fields, V3 risk items.

### 6.4 Visit Plan Suggestions

```text
User selects account/opportunity/contact
-> AI reviews relationship state, opportunity stage, last activities, open risks, and next step
-> AI suggests visit goal, attendee strategy, talking points, questions, materials, success criteria, and follow-up actions
-> user confirms selected follow-up actions into activity drafts
```

Visit plan output:

- Visit objective.
- Recommended attendees and why.
- Customer-side stakeholder focus.
- Agenda and talking points.
- Questions to validate budget, decision process, timeline, risks, and next action.
- Materials to prepare.
- Expected meeting outcome.
- Follow-up action drafts.

### 6.5 Communication Method Recommendation

```text
User selects contact or opportunity
-> AI reads contact role, attitude, influence, relationship heat, project role, recent feedback, and opportunity stage
-> AI recommends communication method, tone, message focus, and escalation path
-> user uses recommendation manually or creates a follow-up activity draft
```

Communication recommendations can include:

- Phone call for urgent alignment.
- Formal meeting for decision confirmation.
- WeChat-style short follow-up for warm relationship maintenance.
- Executive visit when decision power is missing.
- Technical workshop when user pain or solution fit is unclear.
- Written recap when facts or commitments need confirmation.

## 7. Object Draft Rules

### 7.1 Account Draft

Required before write:

- `account_name`
- `owner_user_id`

Matching:

- Exact account name match links to existing account.
- Similar name match creates a conflict warning and requires confirmation.

Write behavior:

- If matched account exists, V4 suggests update but defaults to no master-data update unless user explicitly selects update.
- If no match exists, confirmed draft creates a new account.

### 7.2 Contact Draft

Required before write:

- `contact_name`
- `account_id`

Matching:

- Match by contact name within matched account.
- If account is missing, draft status becomes `need_more_info`.

Write behavior:

- Confirmed draft creates a contact or updates an existing contact only when user explicitly selects update.

### 7.3 Opportunity / Lead Draft

V4 treats "线索" as an opportunity draft whose initial stage is `lead` / `商业线索`.

Required before write:

- `opportunity_name`
- `account_id`
- `owner_user_id`

Defaulting:

- If text says "线索" or lacks a clear later sales stage, set `stage = lead`.
- If status is missing, set `status = following`.
- If risk is missing, set `risk_status = normal`.

Write behavior:

- Confirmed draft creates an opportunity.
- V4 first release does not use AI to close, reopen, or change opportunity stage for an existing opportunity.

### 7.4 Sales Activity Draft

Required before write:

- `activity_subject`
- `activity_type`
- `account_id`
- `activity_time`
- `owner_user_id`

Write behavior:

- Confirmed draft creates a sales activity through existing ActivityService.
- Existing weekly progress remains derived from completed sales activities.

## 8. AI Context Model

The assistant must build recommendations from explicit CRM context:

| Context | Source |
|---|---|
| Account profile | account fields, owner, collaborators, region, level, source |
| Contact relationship | role, attitude, influence, heat, project role, latest activity |
| Opportunity state | stage, status, amount, expected close date, risk, owner, collaborators |
| Sales process | activities, next steps, risks, weekly progress |
| Business execution | solution, contract, invoice, receivable, reconciliation summaries when present |
| Management signal | V3 dashboard risks and attention items |
| Permissions | current user permissions and data scope |

AI recommendations must display the evidence list used to produce the answer.

## 9. Extraction And Recommendation Strategy

V4 first release can use deterministic local rules and templates before connecting a real model provider.

Required behavior:

- Parse structured text patterns such as `客户：`, `联系人：`, `商机：`, `线索：`, `下一步：`, `风险：`.
- Support free-text fallback by creating low or medium confidence drafts and recommendations.
- Generate weekly reports and sales suggestions from CRM data using deterministic summaries first.
- Keep extractor, analyzer, report generator, visit planner, and communication advisor behind service interfaces so model-based implementations can replace them later.
- Store raw input and recommendation evidence.
- Never copy plaintext secrets into evidence documents.

## 10. Data Model

Use the existing planned AI domain tables:

- `ai_input_records`
- `ai_extraction_drafts`
- `ai_confirmation_tasks`
- `ai_write_logs`

Add V4 recommendation records:

- `ai_recommendation_records`

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Recommendation id |
| `recommendation_type` | weekly_report, opportunity_analysis, visit_plan, communication_advice |
| `source_object_type` | account, contact, opportunity, activity, weekly |
| `source_object_id` | Nullable source object id |
| `request_payload` | User-selected scope, date range, or object ids |
| `result_payload` | Generated structured result |
| `evidence_payload` | CRM facts used by AI |
| `status` | draft, confirmed, rejected |
| `created_by` | Requesting user |
| `confirmed_by` | Confirming user |
| `created_at` | Created time |
| `confirmed_at` | Confirmed time |

## 11. API Contract

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/ai-inputs` | Submit text and create input record plus CRM drafts. |
| `GET` | `/api/ai-inputs` | List current user's input records. |
| `GET` | `/api/ai-drafts` | List drafts by status, type, submitter, or matched object. |
| `PATCH` | `/api/ai-drafts/{draftId}` | Edit extracted fields or supplement missing fields. |
| `POST` | `/api/ai-drafts/{draftId}/confirm` | Confirm and write a draft to CRM. |
| `POST` | `/api/ai-drafts/{draftId}/reject` | Reject a draft with reason. |
| `POST` | `/api/ai-recommendations/weekly-report` | Generate weekly report draft. |
| `POST` | `/api/ai-recommendations/opportunity-analysis` | Generate opportunity analysis. |
| `POST` | `/api/ai-recommendations/visit-plan` | Generate visit plan suggestion. |
| `POST` | `/api/ai-recommendations/communication-advice` | Generate communication recommendation. |
| `POST` | `/api/ai-recommendations/{recommendationId}/confirm` | Confirm generated report, plan, or advice for retention. |
| `POST` | `/api/ai-recommendations/{recommendationId}/reject` | Reject generated recommendation with reason. |
| `GET` | `/api/ai-logs` | List AI write logs and recommendation logs. |

Permissions:

- `ai.input.create`
- `ai.input.read`
- `ai.draft.read`
- `ai.draft.update`
- `ai.draft.confirm`
- `ai.draft.reject`
- `ai.recommendation.generate`
- `ai.recommendation.confirm`
- `ai.recommendation.read`
- `ai.log.read`

Confirming a CRM draft also requires the corresponding target permission.

## 12. UI Behavior

### AI Workbench

- Main text input.
- Scope selector: record data, weekly report, opportunity analysis, visit plan, communication advice.
- Recent drafts and suggestions.
- Suggested next actions for the current user.

### Draft Confirmation

- Group drafts by object type.
- Show raw text, extracted fields, missing fields, conflicts, confidence, and matched objects.
- Disable confirm until required fields are complete.

### Weekly Report

- Week selector and owner scope.
- Generated report sections with editable text.
- Evidence drawer listing activities, opportunities, and risks used.
- Confirmed report can be retained as evidence and copied into weekly progress workflows.

### Opportunity Analysis

- Opportunity selector.
- Analysis cards: stage health, relationship gap, risk, blockers, next-best actions.
- Evidence list with links to CRM objects.
- Convert selected next action into activity draft.

### Visit Planner

- Account, opportunity, and contact selectors.
- Visit objective and agenda suggestion.
- Attendee strategy and preparation checklist.
- Follow-up action draft generation.

### Communication Advisor

- Contact or opportunity selector.
- Recommended channel, tone, message focus, timing, and escalation route.
- Evidence from contact relationship and recent feedback.

### AI Logs

- Log type filter: write log, recommendation log.
- Detail drawer shows source input, evidence, output, confirmer, result, and failure reason.

## 13. Error Handling

- Extraction failure marks input as `abnormal` and records `error_message`.
- Missing required fields keeps draft at `need_more_info`.
- Permission failure creates a failed write log and returns 403.
- Business validation failure creates a failed write log and returns a business error.
- Recommendation generation with insufficient context returns an explainable incomplete result, not a fabricated answer.
- Confirming an already written or rejected draft is rejected with a business error.
- Target object not found or inaccessible is shown as a conflict that requires manual selection.

## 14. Testing and Acceptance

Automated tests must cover:

- Text input creates input record and multiple CRM drafts.
- Lead text creates opportunity with `stage = lead`.
- Activity draft writes activity and appears in weekly progress.
- Weekly report generation uses activities, opportunity progress, risks, and next steps.
- Opportunity analysis returns evidence-backed stage judgment, risk, blockers, and next-best actions.
- Visit plan generation returns objective, attendees, agenda, materials, and follow-up drafts.
- Communication advice uses contact role, attitude, influence, relationship heat, and recent feedback.
- Missing required fields block confirmation.
- Confirmed writes create `ai_write_logs`.
- Recommendations create `ai_recommendation_records`.
- Permissions require both AI permission and target object permission.
- OpenAPI covers all AI assistant APIs.

Browser UAT must cover:

- Submit text containing account, contact, lead, and activity.
- Confirm each draft type.
- Generate weekly report from existing activity and opportunity data.
- Generate opportunity analysis and convert a next action into an activity draft.
- Generate visit plan and communication advice.
- Verify records appear in normal CRM pages.
- Verify logs are visible.

## 15. Completion Standard

V4 first release is complete when:

- AI Workbench, Draft Confirmation, Weekly Report, Opportunity Analysis, Visit Planner, Communication Advisor, and AI Logs are accessible from `AI助手`.
- Text input can produce account, contact, opportunity lead, and activity drafts.
- AI can generate weekly reports, opportunity analysis, visit plans, and communication recommendations from CRM context.
- Recommendations display supporting evidence.
- Human confirmation writes records or retains recommendations through auditable flows.
- Every write attempt creates an AI write log.
- Every retained recommendation creates an AI recommendation record.
- Automated backend, frontend, OpenAPI, and browser UAT evidence pass.
- V4 TODOList shows all modules Done and Go/No-Go is signed by the final confirmer.
