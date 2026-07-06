# V4 AI Sales Assistant Design

Date: 2026-07-06

## 1. Goal

V4 adds an AI sales assistant that turns natural language input into confirmed CRM records. The first release focuses on text-based entry for sales foundation data: accounts, contacts, opportunities in the `lead` stage, and sales activities.

The assistant reduces manual entry while keeping human confirmation, permission checks, required fields, and write audit intact.

## 2. Confirmed Scope

V4 does:

- Text input for accounts, contacts, opportunities, commercial leads, and sales activities.
- Treat "lead" as the existing opportunity stage `lead` / `商业线索`; V4 does not create a standalone lead pool.
- Generate one or more AI drafts from a single input.
- Match existing accounts, contacts, and opportunities when the input mentions known names.
- Ask for missing required fields before write.
- Show conflict warnings when extracted data differs from existing CRM data.
- Require human confirmation before writing any CRM object.
- Write confirmed drafts through existing business services so permissions, validation, and audit rules still apply.
- Record AI write logs for every successful or failed write attempt.
- Keep weekly progress derived from sales activities instead of letting AI directly edit weekly progress.

V4 does not do:

- Voice transcription.
- Attachment parsing.
- Enterprise WeChat, DingTalk, Feishu, email, or meeting-system integration.
- Standalone lead pool.
- AI direct update of contract, invoice, payment, or reconciliation records.
- AI direct opportunity stage change beyond creating an opportunity in the `lead` stage.
- Automatic write without human confirmation.

## 3. User Roles

| Role | V4 usage |
|---|---|
| Sales user | Submit text, review drafts, confirm account/contact/opportunity/activity writes within own data scope. |
| Sales manager | Review team drafts, confirm team data when permitted, inspect AI write logs. |
| Admin | Configure permissions, inspect AI write logs and audit trail. |
| Executive | Read-only visibility into created CRM data through existing V1/V3 pages, not AI draft operation. |

## 4. Navigation

Add a top-level menu item: `AI助手`.

Child pages:

| Page | Route | Purpose |
|---|---|---|
| AI Input Desk | `/ai-assistant` | Paste text, choose input type, submit for extraction, see generated drafts. |
| Draft Confirmation | `/ai-assistant/drafts` | Review, edit, supplement, confirm, or reject AI drafts. |
| AI Write Logs | `/ai-assistant/write-logs` | Inspect write result, target object, confirmer, before/after summary, and failure reason. |

The first screen should be the AI Input Desk, not a marketing page.

## 5. Business Flow

```text
User pastes text
-> backend stores ai_input_records
-> extraction service creates ai_extraction_drafts
-> each draft is classified as account/contact/opportunity/activity
-> matcher links existing account/contact/opportunity when confidence is high
-> validator marks missing required fields and conflicts
-> confirmation task is created for the submitter
-> user reviews or edits draft
-> user confirms write
-> backend calls existing Account/Contact/Opportunity/Activity services
-> write result is stored in ai_write_logs
-> created records appear in normal CRM pages
```

## 6. Object Draft Rules

### 6.1 Account Draft

Supported extracted fields:

- `account_name`
- `account_type`
- `industry`
- `region`
- `account_level`
- `account_source`
- `owner_user_id`
- `notes`

Required before write:

- `account_name`
- `owner_user_id`

Matching:

- Exact account name match links to existing account.
- Similar name match creates a conflict warning and requires confirmation.

Write behavior:

- If matched account exists, V4 first release suggests update but defaults to "do not update existing master data unless user explicitly selects update".
- If no match exists, confirmed draft creates a new account.

### 6.2 Contact Draft

Supported extracted fields:

- `contact_name`
- `account_id` or `account_name`
- `department`
- `position`
- `mobile`
- `email`
- `wechat`
- `contact_type`
- `project_role`
- `attitude`
- `influence_level`
- `notes`

Required before write:

- `contact_name`
- `account_id`

Matching:

- Match by contact name within matched account.
- If account is missing, draft status becomes `need_more_info`.

Write behavior:

- Confirmed draft creates a contact or updates an existing contact only when user explicitly selects update.

### 6.3 Opportunity / Lead Draft

V4 treats "线索" as an opportunity draft whose initial stage is `lead` / `商业线索`.

Supported extracted fields:

- `opportunity_name`
- `account_id` or `account_name`
- `stage`
- `status`
- `estimated_contract_amount`
- `expected_close_date`
- `owner_user_id`
- `risk_status`
- `source`
- `description`

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

### 6.4 Sales Activity Draft

Supported extracted fields:

- `activity_subject`
- `activity_type`
- `account_id` or `account_name`
- `opportunity_id` or `opportunity_name`
- `contact_ids` or contact names
- `activity_time`
- `status`
- `communication_content`
- `customer_feedback`
- `conclusion`
- `next_step`
- `next_follow_up_at`
- `risk_type`
- `risk_description`

Required before write:

- `activity_subject`
- `activity_type`
- `account_id`
- `activity_time`
- `owner_user_id`

Defaulting:

- If activity time is missing, use submit time and mark the field as system-defaulted.
- If status is missing, set `status = completed` only when the text clearly describes an already completed meeting or communication; otherwise set `status = planned`.

Write behavior:

- Confirmed draft creates a sales activity through existing ActivityService.
- Existing weekly progress remains derived from completed sales activities.

## 7. Extraction Strategy

V4 first release can use a deterministic local extractor before connecting a real model provider.

Required behavior:

- Parse structured text patterns such as `客户：`, `联系人：`, `商机：`, `线索：`, `下一步：`, `风险：`.
- Support free-text fallback by creating an activity draft with low or medium confidence.
- Always store the raw input.
- Produce confidence metadata and missing field lists.
- Never copy plaintext secrets into evidence documents.

The design keeps the extractor behind a service interface so a later model-based implementation can replace deterministic parsing without changing the API contract.

## 8. Data Model

Use the existing planned AI domain tables:

- `ai_input_records`
- `ai_extraction_drafts`
- `ai_confirmation_tasks`
- `ai_write_logs`

V4 first release adds these implementation details:

- `draft_type` values: `account`, `contact`, `opportunity`, `activity`
- `suggested_action` values: `create`, `update`, `append_activity`
- `draft_status` values: `need_more_info`, `pending_confirm`, `confirmed`, `rejected`, `written`
- `process_status` values on input: `pending`, `processing`, `pending_confirm`, `written`, `rejected`, `abnormal`

## 9. API Contract

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/ai-inputs` | Submit text and create input record plus drafts. |
| `GET` | `/api/ai-inputs` | List current user's input records. |
| `GET` | `/api/ai-drafts` | List drafts by status, type, submitter, or matched object. |
| `GET` | `/api/ai-drafts/{draftId}` | Get draft detail, extracted fields, missing fields, conflicts, and source text. |
| `PATCH` | `/api/ai-drafts/{draftId}` | Edit extracted fields or supplement missing fields. |
| `POST` | `/api/ai-drafts/{draftId}/confirm` | Confirm and write a draft to CRM. |
| `POST` | `/api/ai-drafts/{draftId}/reject` | Reject a draft with reason. |
| `GET` | `/api/ai-write-logs` | List AI write logs. |

Permissions:

- `ai.input.create`
- `ai.input.read`
- `ai.draft.read`
- `ai.draft.update`
- `ai.draft.confirm`
- `ai.draft.reject`
- `ai.write-log.read`

Confirming a draft also requires the corresponding target permission:

- Account draft: `account.create` or `account.update`
- Contact draft: `contact.create` or `contact.update`
- Opportunity draft: `opportunity.create` or `opportunity.update`
- Activity draft: `activity.create` or `activity.update`

## 10. UI Behavior

### AI Input Desk

- Large text input.
- Input type selector: text, meeting minutes, WeChat excerpt, email excerpt.
- Submit button.
- After submit, show draft cards grouped by object type.
- Each draft card shows confidence, matched object, missing fields, and action button.

### Draft Confirmation

- Filter by status and draft type.
- Detail drawer shows raw text on the left and editable extracted fields on the right.
- Missing fields are highlighted.
- Conflicts are shown above the form.
- Confirm button is disabled until required fields are complete.
- Reject button requires a reason.

### AI Write Logs

- Table columns: time, draft type, target object, write method, operator, result, failure reason.
- Detail drawer shows source input, extracted fields, before/after summary, and target link.

## 11. Error Handling

- Extraction failure marks input as `abnormal` and records `error_message`.
- Missing required fields keeps draft at `need_more_info`.
- Permission failure creates a failed write log and returns 403.
- Business validation failure creates a failed write log and returns a business error.
- Confirming an already written or rejected draft is idempotently rejected with a business error.
- Target object not found or inaccessible is shown as a conflict that requires manual selection.

## 12. Testing and Acceptance

Automated tests must cover:

- Text input creates input record and multiple drafts.
- Account draft creates account only after confirmation.
- Contact draft requires matched account.
- Lead text creates opportunity with `stage = lead`.
- Activity draft writes activity and appears in weekly progress.
- Missing required fields block confirmation.
- Low confidence blocks direct write and requires confirmation.
- Confirm write creates `ai_write_logs`.
- Permission checks require both AI permission and target object permission.
- OpenAPI covers all AI assistant APIs.

Browser UAT must cover:

- Submit text containing account, contact, lead, and activity.
- Confirm each draft type.
- Verify records appear in normal account/contact/opportunity/activity pages.
- Verify sales activity appears in weekly progress.
- Verify write logs are visible.

## 13. Completion Standard

V4 first release is complete when:

- AI Input Desk, Draft Confirmation, and AI Write Logs are accessible from `AI助手`.
- Text input can produce account, contact, opportunity lead, and activity drafts.
- Required missing fields and conflicts are visible before write.
- Human confirmation writes records through existing business services.
- Every write attempt creates an AI write log.
- Automated backend, frontend, OpenAPI, and browser UAT evidence pass.
- V4 TODOList shows all modules Done and Go/No-Go is signed by the final confirmer.
