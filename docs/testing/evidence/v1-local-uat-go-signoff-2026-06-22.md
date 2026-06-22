# CRM V1 Local UAT Go Signoff Evidence

Date: 2026-06-22

Scope: current local UAT environment and current-environment Agent acceptance.

Boundary: this evidence records the user-authorized local UAT Go decision and the existing Agent acceptance roster. It does not impersonate external customer staff or replace a future production human signoff package if governance requires one.

## Environment

| Field | Value |
|---|---|
| Environment name | V1-local-uat-20260622 |
| Frontend URL | http://127.0.0.1:5174/ |
| Backend API URL | http://127.0.0.1:8080/ |
| Candidate version | v1.0.0-rc.8 |
| Git commit | 921af70601762659adc7b6dad098d3e149e45c84 |
| Login account | demo_admin |
| Credential handling | Credential provided in the current session; no plaintext credential is recorded in repository evidence. |

## User Authorization

| Field | Value |
|---|---|
| Authorization date | 2026-06-22 |
| Authorization source | User instruction in current Codex workspace thread confirming local UAT start, default UAT evidence OK, personal signoff, and GO. |
| Signer | 沈思维 |
| Decision | Go |
| Evidence boundary | Local UAT evidence and Agent acceptance evidence only. |

## Agent Acceptance Source

| Evidence | Reference |
|---|---|
| Current-environment Agent acceptance roster | docs/meeting-notes/evidence/kickoff/agent-acceptance-roster.md |
| Local UAT smoke and bootstrap evidence | docs/testing/evidence/v1-local-uat-2026-06-18.md |
| Compose UAT bootstrap evidence | docs/testing/evidence/v1-compose-uat-2026-06-19.md |
| RC8 release evidence | docs/releases/v1.0.0-rc.8.md |
| Browser smoke screenshot | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png |

## Local UAT Decision

| Gate | Result | Evidence |
|---|---|---|
| Local frontend access | PASS | docs/testing/evidence/artifacts/v1-rc8-local-browser-smoke-20260619.png |
| Local backend API access | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md |
| Bootstrap permission and V1 data visibility | PASS | docs/testing/evidence/v1-local-uat-2026-06-18.md docs/testing/evidence/v1-compose-uat-2026-06-19.md |
| P0/S1 open defects | 0 open | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| P1/S2 open defects | 0 open | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
| Current local UAT decision | Go | docs/testing/evidence/v1-local-uat-go-signoff-2026-06-22.md |
