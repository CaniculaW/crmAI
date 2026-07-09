# CRM AI V4 Public Deployment Record

Date: 2026-07-09
Target: 120.55.73.23
OS: CentOS 7.9 x86_64

## Runtime Topology

- Public entry: `http://120.55.73.23/`
- Frontend container: `crm-ai-frontend`, exposed on `0.0.0.0:80`
- Backend container: `crm-ai-backend`, bound to `127.0.0.1:8080`
- PostgreSQL container: `crm-ai-db`, bound to `127.0.0.1:55432`
- Docker network: `crm-ai-net`
- Public API path: `http://120.55.73.23/api/*`, proxied by frontend Nginx to backend

## Deployment Inputs

- Repository: `https://github.com/CaniculaW/crmAI.git`
- Server source path: `/opt/crmAI`
- Runtime artifact path: `/opt/crmAI/runtime`
- Demo seed: enabled for validation
- Secrets: database password generated on the server and stored outside the repository

## Verification Evidence

- Server containers:
  - `crm-ai-frontend`: `Up`, port `0.0.0.0:80->80/tcp`
  - `crm-ai-backend`: `Up`, port `127.0.0.1:8080->8080/tcp`
  - `crm-ai-db`: `Up`, port `127.0.0.1:55432->5432/tcp`
- Backend migrations: Flyway applied 34 migrations, schema at version `v34`
- Server health check: `GET http://127.0.0.1:8080/api/health` returned `status=UP`
- Server frontend check: `HEAD http://127.0.0.1/` returned HTTP 200
- Public frontend check: `HEAD http://120.55.73.23/` returned HTTP 200
- Public API check: `GET http://120.55.73.23/api/health` returned `status=UP`
- Public login smoke: `POST http://120.55.73.23/api/auth/login` returned HTTP 200 and business code `OK`

## Validation Account

- Username: `demo_admin`
- Password: `S3cure!123`

## Residual Risks

- CentOS 7.9 is end-of-life. Plan migration to a supported Linux distribution before production use.
- HTTPS and domain binding are not configured yet. Current public entry is HTTP only.
- Demo seed is enabled for validation. Disable or replace demo credentials before real production use.
- PostgreSQL currently runs with `--privileged` on this CentOS 7.9 host because the default container volume write path failed on the old kernel/storage stack. Revisit after OS upgrade.
- Root password login was used for initial deployment. Rotate the server root password and switch to SSH key login with password authentication disabled.
