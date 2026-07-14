# Approval Workflow Validation

Date: 2026-07-14

Scope: configurable sequential approvals, approval center, approval template configuration, and quotation, bid, and contract business integration.

## Environment

| Item | Value |
|---|---|
| Frontend | `http://127.0.0.1:5176/` |
| Backend API | `http://127.0.0.1:8081/` |
| Database | PostgreSQL 16.14 at `localhost:55432/crm_ai` |
| UAT user | `demo_admin` |
| Browser | Codex in-app browser, desktop and mobile validation |

The local schema and the isolated PostgreSQL 16.14 integration database were upgraded through V38. Flyway validated all 38 migrations and applied both `V37__enforce_single_default_approval_template.sql` and `V38__enforce_single_pending_approval_instance.sql` successfully.

## Automated Verification

| Layer | Command | Result |
|---|---|---|
| Backend full regression | `mvn test` | 187 tests passed, 0 failures, 0 errors |
| PostgreSQL migration integration | `mvn -Ppostgres-it -Dtest=NoUnitTests -Dsurefire.failIfNoSpecifiedTests=false -Dit.test=PostgresMigrationIT verify` | 7 tests passed on PostgreSQL 16.14 |
| Frontend full regression | `npm test -- --run` | 8 test files / 16 suites, 133 tests passed |
| Frontend production build | `npm run build` | Passed; only the existing large-chunk advisory remains |

Coverage includes template uniqueness, pending-instance uniqueness, eligible approver permission and active role state, submission snapshots, role-scoped decisions, concurrent business changes, stale frontend requests, direct-route permission guards, responsive navigation, and OpenAPI contracts.

The final backend gate also reproduced a pre-existing reconciliation-number collision under two simultaneous requests from the same user. The identifier source was changed from timer resolution to UUID, and the existing concurrency regression then returned the intended `200` / `409` pair. The focused test and the subsequent 187-test full suite both passed.

One initial full-suite run encountered a localhost random-port connection reset in the two approval test classes. Both approval classes then passed together (26 tests), and a fresh full-suite rerun passed all 187 tests. No implementation failure was reproduced.

## Browser UAT

| Object | Business ID | Approval instance | Transition | Result |
|---|---:|---:|---|---|
| Quotation | 1 | 1 | drafting -> approving -> approved | Passed; decision comment `UAT审批通过` is visible in business detail |
| Bid | 2 | 2 | drafting -> approving -> approved | Passed; comment `投标材料完整，同意进入后续商务阶段` is visible in business detail |
| Contract | 3 | 3 | drafting -> approving -> rejected -> drafting | Passed; rejection comment `付款条件需补充阶段验收责任后重新提交` is visible in business detail |

Additional browser checks:

- Approval center exposes pending, started, and processed buckets.
- Processed bucket contains quotation, bid, and contract records with their final states.
- Template configuration contains one default active template for each of bid, quotation, and contract.
- Business edit and terminate actions are unavailable while an object is approving and return after rejection where permitted.
- Mobile navigation uses a drawer and keeps business content within the viewport.
- No new browser console errors were recorded after the disconnected rejection-form warning was fixed.
- The audit API returned 18 approval-module records. Instances 1, 2, and 3 each contain a successful `approval.submit`; instances 1 and 2 contain successful `approval.approve`; instance 3 contains a successful `approval.reject`.

## Evidence Artifacts

- `artifacts/approval-center-desktop-20260714.png`
- `artifacts/approval-center-mobile-20260714.png`
- `artifacts/approval-mobile-navigation-20260714.png`
- `artifacts/approval-template-config-desktop-20260714.png`
- `artifacts/solution-approval-approved-20260714.png`
- `artifacts/solution-approval-panel-20260714.png`
- `artifacts/approval-processed-three-objects-20260714.png`
- `artifacts/bid-approval-approved-20260714.png`
- `artifacts/contract-approval-rejected-20260714.png`

## Review Findings Closed

- Enforced one active default template per tenant and object type in PostgreSQL.
- Enforced one pending approval instance per tenant and business object in PostgreSQL; actual duplicate insertion and resubmission-after-completion cases pass on PostgreSQL 16.14.
- Limited approver roles to active users whose `approval.approve` permission is granted by an active, non-deleted role.
- Ignored stale task-detail and template-node responses after selection changes.
- Guarded approval center and configuration routes by permission.
- Aligned OpenAPI required fields and shortcut response schemas with runtime behavior.
- Removed the disconnected Ant Design rejection-form warning while preserving form reset across tasks.

The final independent re-review of `6338cc0..69a379b` returned `APPROVED` with no Critical, Important, or Minor finding.

## Deployment Check

Before applying V38 to an environment that previously ran V36 or V37, query for duplicate `pending` rows grouped by `tenant_id`, `object_type`, and `object_id`. V38 intentionally fails if historical duplicate pending instances exist, so they must be resolved before migration.

## Conclusion

Local release verification is GO. Automated regression, PostgreSQL migration verification, three-object browser UAT, audit verification, and independent code review are complete with no open Critical or Important issue.
