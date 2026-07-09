# CRM AI V4 Public Upgrade Validation - 2026-07-09

## Target

- Public URL: `http://120.55.73.23/`
- Public API: `http://120.55.73.23/api/*`
- Server runtime path: `/opt/crmAI/runtime`

## Upgrade Summary

The public environment was upgraded after local V4 validation found that an older backend runtime can cause V4 AI endpoints to return 500.

Actions performed:

1. Rebuilt local frontend dist with `npm run build`.
2. Rebuilt local backend jar with `mvn -DskipTests package`.
3. Backed up public runtime artifacts to `/opt/crmAI/runtime/backups/20260709-115440`.
4. Uploaded backend jar to `/opt/crmAI/runtime/uploads/app-20260709-v4qa.jar`.
5. Uploaded frontend dist archive to `/opt/crmAI/runtime/uploads/frontend-20260709-v4qa.tgz`.
6. Recreated the public backend container with the refreshed backend jar mounted at `/app/app.jar`.
7. Replaced the mounted frontend dist at `/opt/crmAI/runtime/frontend/dist` and restarted the nginx frontend container.

No server root password or database password is stored in this repository.

## Server Runtime After Upgrade

| Component | Runtime | Exposure | Status |
|---|---|---|---|
| Frontend | `crm-ai-frontend` | `0.0.0.0:80->80/tcp` | Up |
| Backend | `crm-ai-backend` | `127.0.0.1:8080->8080/tcp` | Up |
| PostgreSQL | `crm-ai-db` | `127.0.0.1:55432->5432/tcp` | Up |

Backend startup evidence:

- Flyway validated `34` migrations.
- Current schema version is `34`.
- Tomcat started on port `8080`.
- Local server health returned `status=UP`.

## Public Functional Verification

| Check | Result |
|---|---|
| `HEAD http://120.55.73.23/` | HTTP 200 |
| `GET http://120.55.73.23/api/health` | `status=UP` |
| V4 API smoke | Passed |
| V4 browser smoke | Passed: 24 route checks, 0 console failures, 0 failed responses |
| Public direct backend port `120.55.73.23:8080` | Not reachable from public network |

Evidence:

| Evidence | Path |
|---|---|
| Public V4 API smoke report | `docs/testing/evidence/artifacts/v4-api-smoke-20260709-public/report.json` |
| Public V4 browser smoke report and screenshots | `docs/testing/evidence/artifacts/v4-browser-smoke-20260709-public/report.json` |

## Public Performance Smoke

Scope: 10 key public endpoints, 5 requests per endpoint.

| Endpoint | Failures | Average | Max |
|---|---:|---:|---:|
| `/api/health` | 0 | 23.15 ms | 43.13 ms |
| `/api/bootstrap` | 0 | 25.54 ms | 27.62 ms |
| `/api/accounts` | 0 | 21.44 ms | 24.35 ms |
| `/api/contacts` | 0 | 21.53 ms | 22.87 ms |
| `/api/opportunities` | 0 | 22.84 ms | 25.13 ms |
| `/api/dashboard/overview` | 0 | 46.53 ms | 58.37 ms |
| `/api/ai-context/summary` | 0 | 29.62 ms | 33.17 ms |
| `/api/ai-drafts` | 0 | 21.24 ms | 25.40 ms |
| `/api/ai-weekly-reports` | 0 | 22.24 ms | 26.61 ms |
| `/api/ai-logs?limit=20` | 0 | 25.74 ms | 27.57 ms |

## Public Security Smoke

| Check | Result | Risk |
|---|---|---|
| Unauthenticated `/api/accounts` | 401 `UNAUTHORIZED` | Low |
| Invalid token `/api/accounts` | 401 `UNAUTHORIZED` | Low |
| Wrong password login | 401 `UNAUTHORIZED` | Low |
| Malicious CORS preflight | 403 `Invalid CORS request` | Low |
| Frontend security headers | CSP, X-Frame-Options, nosniff missing | Medium |
| HTTPS | Not configured | Medium |
| Demo seed account | Still enabled for validation | Medium/High before production |

## Go/No-Go

Public V4 upgrade result: **GO for public UAT continuation**.

Production hardening still required before real production use:

- Add HTTPS and domain binding.
- Add frontend security headers.
- Disable demo seed or replace validation credentials with one-time initial credentials.
- Rotate server root password and move to SSH key login.
- Plan migration away from CentOS 7.9.
